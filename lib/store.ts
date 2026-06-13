import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { Learning, LoopSpec, RunRecord } from "@/lib/types";

/**
 * PERSISTENCE LAYER — durable runs + memory + saved loops.
 *
 * This is what makes "self-improving" real instead of per-session React state:
 * memory written by one run is read by the next, across restarts and across the
 * scheduler firing with no human present (PLAN.md acceptance #5, #6).
 *
 * Storage strategy, in order of preference (auto-detected, no config needed):
 *   1. The repo working dir (`runs/`, `memory/`) — durable locally + on desktop
 *      (node-cron). This is the inspectable md-file memory the PLAN describes.
 *   2. `os.tmpdir()/loopsmith` — when cwd is read-only (e.g. Vercel serverless).
 *      Writable but ephemeral per-deploy; fine for dev/demo. Durable web storage
 *      (KV/Blob) is a documented upgrade that needs the user to provision it.
 *   3. In-memory maps — last resort if no filesystem is writable at all, so the
 *      app never crashes; memory simply won't survive the process.
 *
 * Everything is keyed by `loopId` so one deployment can host many saved loops.
 */

const DEFAULT_LOOP = "default";

/* ------------------------------- base dir --------------------------------- */

let baseDirPromise: Promise<string | null> | null = null;

async function writable(dir: string): Promise<boolean> {
  try {
    await fs.mkdir(dir, { recursive: true });
    const probe = path.join(dir, ".probe");
    await fs.writeFile(probe, "ok");
    await fs.rm(probe, { force: true });
    return true;
  } catch {
    return false;
  }
}

/** Resolve (once) the writable base dir, or null if none is writable. */
async function baseDir(): Promise<string | null> {
  if (!baseDirPromise) {
    baseDirPromise = (async () => {
      const repo = process.cwd();
      if (await writable(path.join(repo, ".loopsmith-probe"))) {
        await fs.rm(path.join(repo, ".loopsmith-probe"), { recursive: true, force: true });
        return repo;
      }
      const tmp = path.join(os.tmpdir(), "loopsmith");
      if (await writable(tmp)) return tmp;
      return null;
    })();
  }
  return baseDirPromise;
}

/* ------------------------- in-memory fallback ----------------------------- */

const memFallback = {
  memory: new Map<string, Learning[]>(),
  runs: new Map<string, RunRecord[]>(),
  specs: new Map<string, LoopSpec>(),
};

/* --------------------------------- paths ---------------------------------- */

const safe = (s: string) => s.replace(/[^a-z0-9_-]/gi, "-");
const tsId = (ts: string) => ts.replace(/[:.]/g, "-");

/* --------------------------------- memory --------------------------------- */

function memoryToMd(l: Learning): string {
  return [
    "---",
    `id: ${l.id}`,
    `type: ${l.type}`,
    `trigger: ${JSON.stringify(l.trigger)}`,
    `createdAt: ${l.createdAt}`,
    "---",
    "",
    l.lesson,
    "",
  ].join("\n");
}

function mdToMemory(raw: string): Learning | null {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  const fm: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  let trigger = fm.trigger || "";
  try { trigger = JSON.parse(trigger); } catch { /* plain string */ }
  return {
    id: fm.id || "",
    type: (fm.type as Learning["type"]) || "pattern",
    trigger,
    lesson: m[2].trim(),
    createdAt: fm.createdAt || "",
  };
}

/** All durable learnings for a loop, oldest first. Feeds the next run's policy. */
export async function loadMemory(loopId = DEFAULT_LOOP): Promise<Learning[]> {
  const id = safe(loopId);
  const base = await baseDir();
  if (!base) return memFallback.memory.get(id) ?? [];
  const dir = path.join(base, "memory", id);
  try {
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md"));
    const items: Learning[] = [];
    for (const f of files) {
      const parsed = mdToMemory(await fs.readFile(path.join(dir, f), "utf8"));
      if (parsed) items.push(parsed);
    }
    return items.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  } catch {
    return [];
  }
}

/** Append new learnings as durable, inspectable md files. */
export async function appendMemory(learnings: Learning[], loopId = DEFAULT_LOOP): Promise<void> {
  if (!learnings.length) return;
  const id = safe(loopId);
  const base = await baseDir();
  if (!base) {
    const prev = memFallback.memory.get(id) ?? [];
    memFallback.memory.set(id, [...prev, ...learnings]);
    return;
  }
  const dir = path.join(base, "memory", id);
  await fs.mkdir(dir, { recursive: true });
  for (const l of learnings) {
    const fname = `${tsId(l.createdAt || new Date().toISOString())}-${safe(l.id || l.type)}.md`;
    await fs.writeFile(path.join(dir, fname), memoryToMd(l));
  }
}

/* ---------------------------------- runs ---------------------------------- */

export interface RunSummary {
  ts: string;
  score: number;
  pass: boolean;
  priorLearningCount: number;
  trigger: "manual" | "scheduler";
}

/**
 * Persist one run as the artifacts the acceptance criteria require:
 *   runs/<loopId>/<ts>/output.md   — the deliverable (acceptance #4)
 *   runs/<loopId>/<ts>/gate.json   — numeric score + criteria (acceptance #4)
 *   runs/<loopId>/<ts>/record.json — the full RunRecord (history source)
 */
export async function saveRun(
  record: RunRecord,
  loopId = DEFAULT_LOOP,
  trigger: "manual" | "scheduler" = "manual",
): Promise<string> {
  const id = safe(loopId);
  const base = await baseDir();
  const tagged = { ...record, trigger };
  if (!base) {
    const prev = memFallback.runs.get(id) ?? [];
    memFallback.runs.set(id, [...prev, tagged as RunRecord]);
    return `mem://${id}/${record.ts}`;
  }
  const dir = path.join(base, "runs", id, tsId(record.ts));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "output.md"), record.output || "");
  await fs.writeFile(path.join(dir, "gate.json"), JSON.stringify(record.gate, null, 2));
  await fs.writeFile(path.join(dir, "record.json"), JSON.stringify(tagged, null, 2));
  return dir;
}

/** Run history (summaries), oldest first — the source for the improvement chart. */
export async function listRuns(loopId = DEFAULT_LOOP): Promise<RunSummary[]> {
  const id = safe(loopId);
  const base = await baseDir();
  if (!base) {
    return (memFallback.runs.get(id) ?? []).map((r) => summarize(r));
  }
  const dir = path.join(base, "runs", id);
  try {
    const entries = (await fs.readdir(dir)).sort();
    const out: RunSummary[] = [];
    for (const e of entries) {
      try {
        const rec = JSON.parse(await fs.readFile(path.join(dir, e, "record.json"), "utf8"));
        out.push(summarize(rec));
      } catch {
        /* skip incomplete run dir */
      }
    }
    return out;
  } catch {
    return [];
  }
}

function summarize(r: RunRecord & { trigger?: "manual" | "scheduler" }): RunSummary {
  return {
    ts: r.ts,
    score: r.gate?.score ?? 0,
    pass: r.gate?.pass ?? false,
    priorLearningCount: r.priorLearningCount ?? 0,
    trigger: r.trigger ?? "manual",
  };
}

/* ------------------------------ saved specs ------------------------------- */

/** Persist a loop's spec so the scheduler (and re-runs) can find it later. */
export async function saveSpec(spec: LoopSpec, loopId = DEFAULT_LOOP): Promise<void> {
  const id = safe(loopId);
  const base = await baseDir();
  if (!base) {
    memFallback.specs.set(id, spec);
    return;
  }
  const dir = path.join(base, "loops");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify(spec, null, 2));
}

export async function loadSpec(loopId = DEFAULT_LOOP): Promise<LoopSpec | null> {
  const id = safe(loopId);
  const base = await baseDir();
  if (!base) return memFallback.specs.get(id) ?? null;
  try {
    return JSON.parse(await fs.readFile(path.join(base, "loops", `${id}.json`), "utf8"));
  } catch {
    return null;
  }
}

/** All saved loop ids (for the scheduler to iterate). */
export async function listLoops(): Promise<string[]> {
  const base = await baseDir();
  if (!base) return [...memFallback.specs.keys()];
  try {
    return (await fs.readdir(path.join(base, "loops")))
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}

/** Test helper: wipe everything for a loop id (fs + in-memory). */
export async function _resetLoop(loopId: string): Promise<void> {
  const id = safe(loopId);
  memFallback.memory.delete(id);
  memFallback.runs.delete(id);
  memFallback.specs.delete(id);
  const base = await baseDir();
  if (!base) return;
  await fs.rm(path.join(base, "memory", id), { recursive: true, force: true });
  await fs.rm(path.join(base, "runs", id), { recursive: true, force: true });
  await fs.rm(path.join(base, "loops", `${id}.json`), { force: true });
}
