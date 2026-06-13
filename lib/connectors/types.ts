import type { Signal, ToolOutcome } from "@/lib/types";
import { promises as fs } from "fs";
import path from "path";

/**
 * Connector architecture — the real sensor + tools layer.
 *
 * Each connector talks DIRECTLY to a provider API (fetch, no SDKs), reading
 * credentials from either (a) the runtime credential store (set via the in-app
 * Connect flow — token paste or OAuth) or (b) env vars. A connector is
 * "configured" when its credentials are present; otherwise the engine falls
 * back to fixtures so the demo always runs. This is the port pattern: the engine
 * depends on the Connector interface, not on any specific provider.
 */
export interface Connector {
  source: string;
  label: string;
  configured(): boolean;
  read(limit: number): Promise<Signal[]>;
  /** Optional write action for the tools layer (draft/create/send/...). */
  write?(verb: string, desc: string, dryRun: boolean): Promise<ToolOutcome>;
  note: string;
}

export interface ConnectorStatus {
  source: string;
  label: string;
  configured: boolean;
  note: string;
}

/* ------------------------- runtime credential store ------------------------ */
/**
 * In-memory creds, hydrated from a best-effort JSON file and writable by the
 * Connect flow. On Vercel the FS is ephemeral per instance, so connected creds
 * persist within a warm instance + the file; for durable multi-session storage
 * point LOOPSMITH_DATA_DIR at a volume or swap this for Vercel KV.
 */
const DIR = process.env.LOOPSMITH_DATA_DIR || path.join(process.cwd(), ".loopsmith-data");
const FILE = path.join(DIR, "credentials.json");

const mem: Record<string, string> = {};
let loaded = false;

/** Hydrate mem from disk once. Async entry points (status/read) call this. */
export async function loadCreds(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await fs.readFile(FILE, "utf8");
    Object.assign(mem, JSON.parse(raw));
  } catch {
    /* no creds file yet */
  }
}

/** Connect a credential at runtime (token paste / OAuth callback). */
export async function setCred(key: string, value: string): Promise<void> {
  mem[key] = value;
  process.env[key] = value; // make it live for the current instance immediately
  try {
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(mem, null, 2));
  } catch {
    /* persistence is best-effort */
  }
}

/** Trimmed credential: runtime store first, then env. Sync (mem must be warm). */
export function env(name: string): string {
  const v = mem[name] ?? process.env[name];
  return v && v.trim() ? v.trim() : "";
}

export function envAny(...names: string[]): string {
  for (const n of names) {
    const v = env(n);
    if (v) return v;
  }
  return "";
}
