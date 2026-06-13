# Loopsmith — 60-Second Demo Recording Script

> "The Chief of Staff that builds your Chief of Staff." Interview a non-technical leader → design a self-improving operating loop (sensor → policy → tools → gate → learning) → the gate **holds** weak output → it learns the operator's preference → the score **climbs** → hand them a downloadable Claude Code repo.

---

## 1. TL;DR

**Record ONE page: `https://loopsmith-sepia.vercel.app/build`.**

Why this one: the entire pitch arc — interview → spec → live run → gate **holds** → teach a preference → re-run → score **climbs** → **download the repo** — happens inline on `/build` with zero navigation. The Console (`/`) and `/runs` are split surfaces with in-memory state and no nav between them (refresh wipes them), so they're higher-risk and tell only part of the story. `/build` is self-contained and is the strongest visual proof beat.

> ⚠️ **Reality vs. pitch:** the pitch implies the loop "runs live" after the interview automatically. It does **not** auto-run — after the interview it shows a **spec card**, and you click **"Run on a sample week"** to start the run inline. Script reflects the real flow.

**Real wall-clock to expect (measured):**
| Beat | Measured time |
|---|---|
| Interview (4 questions, 5 server calls) | ~25s |
| Run 1 (cold, no memory) → scores **76**, HELD | ~20s |
| Run 2 (after a taught preference) → scores **89**, PASS | ~15s |
| Download (.zip) | instant (~1s) |
| **Raw total** | **~62s + typing/clicks ≈ 90–110s** |

**Editing target:** Record the full ~90–110s, then in the editor **speed the three LLM "Thinking" gaps to 3–4× and jump-cut the dead air** (policy gap is ~10s on run 1 — the biggest cut). Interview answers are clicks (fast). Net: comfortably under 60s with voiceover. Keep the **gate score numbers (76 → 89)** and the **"Fit to operator" bar climbing** at real-time-ish speed so the payoff reads.

---

## 2. Exact recording walkthrough

Numbers are **real** (from the run smoke test: run 1 = **76 / held**, run 2 = **89 / pass**). The interview questions/chips are **server-generated and non-deterministic** — do NOT hard-script chip labels; click the **first chip** each time (the smoke test confirms this path reliably finishes in 4 questions with a clean spec named *"Morning Revenue Mover"*). Free-text answers via the bottom bar also work as a fallback.

| Timecode | ACTION (verbatim labels) | WHAT APPEARS (real on-screen) | VOICEOVER (one line) |
|---|---|---|---|
| 0:00–0:05 | Open `https://loopsmith-sepia.vercel.app/build`. Cursor rests on heading. | Heading **"What should run itself for you?"**, three example chips, bottom input bar placeholder **"Describe what should run itself for you…"**, top-right **"Build a loop · Opus 4.8"**. | "This is Loopsmith — the Chief of Staff that builds *your* Chief of Staff." |
| 0:05–0:09 | Click the first example chip: **"Turn this week's Slack, calls and email into the 2–3 moves that move revenue, and draft the outreach."** | Phase flips to interview; your text appears as a right-aligned bubble; **"Thinking"** dots, then the first assistant question with answer chips. | "I describe a workflow in plain English — no config." |
| 0:09–0:23 | Answer the 4 questions by clicking the **first chip** on each (single-select chips advance instantly). | Four Q&A turns stream in (e.g. signals → cadence → output → approvals). "Thinking" dots between each (~5s each — speed these in edit). | "It interviews me like a chief of staff would — just business questions." |
| 0:23–0:28 | (No click — interview finishes, spec card renders.) Hover over the spec card. | **Spec card**: badge **"Your loop"** + name **"Morning Revenue Mover"**; rows **"Listens to"**, **"Decides"**, **"Produces"**, **"Checks against 5 quality standards (ships ≥ 80/100)"**; **"Quality bar"** rubric chips incl. **"Fit to operator · 25"** highlighted. | "It designs the whole loop — sensors, policy, output, and a quality bar to grade itself." |
| 0:28–0:30 | Click primary button **"Run on a sample week"** (spark icon). | Phase → run console. Bottom input bar hides. Five stage cards begin streaming. | "Now watch it run — live." |
| 0:30–0:34 | (No click — watch stream.) **"Listening"** then **"Deciding"** (Opus 4.8 badge). | **"Listening"**: *"Ingested N signals."* + signal list. **"Deciding"**: streamed reasoning (longest gap ~10s — speed in edit). | "It ingests the week's signals and decides what actually moves revenue." |
| 0:34–0:40 | (No click — watch.) **"Acting"** then **"Checking"** (Opus 4.8 badge). | **"Acting"**: tool outcomes each tagged **"dry-run"**. **"Checking"**: score chip **76/100** + **"below bar — held for review"** (red) + per-criterion bars (**"Fit to operator"** low). | "Here's the magic — the gate **holds it**. Seventy-six, below the eighty bar. It refuses to ship weak work." |
| 0:40–0:43 | (No click.) **"Learning"** (Opus 4.8 badge) finishes; **Feedback** panel **"Make it yours"** appears. | **"Learning"**: *"✎ wrote N lesson(s) to memory…"*. Panel header **"Make it yours"** + textarea. | "And it writes down what it learned." |
| 0:43–0:48 | In the **"Make it yours"** textarea type: **`Always lead with the dollar amount and keep every draft under 4 sentences.`** Click **"Teach & re-run"** (learning icon). | Text enters (button enables at ≥3 chars). Run restarts; stages re-stream (faster, ~15s — speed in edit). | "I teach it one preference — lead with the dollar amount — and re-run." |
| 0:48–0:53 | (No click — watch **"Checking"** on the second run.) | **"Checking"**: score chip **89/100** + **"passes the gate — ships"** (green); **"Fit to operator"** bar visibly higher than run 1. | "Same loop, now eighty-nine — it passed. It learned *me*, and the score climbed." |
| 0:53–0:57 | In the post-run footer (**"This loop is yours to keep —"**) click **"Download project (.zip)"**. | Button → **"Zipping…"** → browser downloads `morning-revenue-mover.zip`. | "Then it hands me the whole thing — a runnable Claude Code repo." |
| 0:57–0:60 | Cut to Finder showing the unzipped folder (15 files: `loop-spec.json`, `CLAUDE.md`, `engine/`, `tests/loop.test.mjs`, `package.json`…). *(Optional terminal cutaway: `npm test` green.)* | Finder window with the 15-file repo. | "Mine to keep, mine to run. That's Loopsmith." |

**Fallback for the interview (if chips don't render):** click the bottom bar and type answers, pressing **Enter** each time, e.g. `A deal is stalling or going quiet` → `Every morning` → `Top 2-3 moves plus ready-to-send draft messages` → `Always draft for my review`. This is the exact path the smoke test ran to reach the spec.

---

## 3. The two judge beats

**(a) "You directed Claude + it verified itself."**
- **On-screen moment:** the **"Checking"** stage (Opus 4.8 badge) showing the **76/100** score chip + per-criterion rubric bars. The operator only typed plain English; Claude designed the rubric *and* graded its own output against it. Reinforce with the spec card's **"Checks against 5 quality standards (ships ≥ 80/100)"** at 0:23–0:28. The human gave direction; the machine wrote *and* verified the work.

**(b) "It caught and fixed its own failure live."**
- **On-screen moment:** the **76 / "below bar — held for review" (red)** at 0:34–0:40 → teach a preference → **89 / "passes the gate — ships" (green)** at 0:48–0:53, with the **"Fit to operator"** bar climbing between the two runs. The gate catches its own weak output, refuses to ship, learns the fix, and clears the bar on the next run — failure detected and corrected on camera.

---

## 4. Pre-flight checklist (do once, right before recording)

1. **Warm the serverless instance.** Hit `https://loopsmith-sepia.vercel.app/api/health` (expect `{"status":"ok"...}`) and do **one full throwaway run on `/build`** (interview → "Run on a sample week"). This kills cold-start latency so the recorded run is the ~15–20s warm path, not a cold spike.
2. **Confirm the arc is intact** on the throwaway run: run 1 should land **below 80 / held**, and after **"Teach & re-run"** it should climb **above 80 / pass**. (Smoke test: 76 → 89.) If the live numbers differ, re-record the throwaway until you see *held → pass*; the exact integers can vary slightly but the **shape** must hold.
3. **Pre-write your preference line** so you can paste, not type on camera: `Always lead with the dollar amount and keep every draft under 4 sentences.` (≥3 chars so the **"Teach & re-run"** button is enabled.)
4. **Verify the download** once: click **"Download project (.zip)"**, unzip, confirm the **15 files** and `package.json` has `"test": "node --test"`. Keep the unzipped folder open in Finder for the closing cut.
5. **Clear the Downloads folder** of prior `.zip`s so the closing Finder shot is clean.
6. **AVOID on camera:** any **"Run on my real data"** paste flow with live connectors/OAuth — stick to **"Run on a sample week"** (dry-run, synthetic signals, no external I/O, deterministic timing). Don't refresh mid-demo. Don't type during a run (the input bar is hidden while streaming — by design). Don't pick a preference note under 3 chars (button stays silently disabled).

---

## 5. Backup plan

If a live run errors (red error box from a stream hiccup / malformed NDJSON line) or is too slow on the day:

1. **Best fallback — pre-record the run beats in the warm-up.** During pre-flight you already do a full run. Screen-record that warm-up run and keep the clip; if the on-stage run stalls, cut to the pre-recorded **76 → teach → 89** segment. The flow is identical, so the cut is invisible.
2. **Pre-seed the trend chart (Console/`/runs` fallback).** Fire 2–3 runs ahead of time (mix manual + scheduler; aim for one red **held** bar then green **passed** bars) so `/runs?loop=...` shows a real climbing bar chart with the **delta pill ("▲ N pts since run 1")** and the legend. Then the "self-improvement over time" story reads from history even without a fresh live run. Note: Console history is in-memory only — **do not refresh** if you go this route, and remember the `/runs` store is separate from the Console's in-memory state, so verify a run round-trips before claiming "here's the one I just did."
3. **If the whole `/build` run is dead:** narrate over the **spec card** (it renders from the fast, reliable `/api/interview` path, ~25s, zero stream risk) + the **download** (deterministic `/api/build` → JSZip, instant), and drop in the pre-recorded run clip for the gate beat. The spec + download alone still prove "designed a loop, handed you a repo."
4. **Terminal proof (optional credibility cutaway):** `npm test` in the unzipped repo (it's `node --test`, runs offline), or `curl -X POST .../api/workflow -d '{"runLoop":false,"spec":{...}}'` → `ok:true` per-stage report. Neither is rendered in-browser, so only use as a deliberate cutaway, not the main beat.

---

## 6. Recording setup

- **Tool:** macOS screen recording — **Cmd + Shift + 5** → "Record Selected Portion." Record a fixed region, not the full screen.
- **Window size:** browser at **1280 × 800** (the `/build` layout reads cleanly; large enough that the gate score chip and rubric bars are legible, small enough to avoid empty margins).
- **Zoom:** browser at **110–125%** so the **76/100** and **89/100** score chips and the **"Fit to operator"** bar are unmistakable on a projected screen. Verify the spec card still fits without scrolling at that zoom.
- **Theme:** **light mode** (matches the product's intended look; cleaner contrast on the gradient rubric bar and the green/red verdict strings).
- **Hide chrome:** full-screen the browser tab / hide the bookmarks bar; close other tabs so the tab strip isn't cluttered; hide the macOS Dock (System Settings → Desktop & Dock → Automatically hide). Clear notifications (Do Not Disturb on).
- **Cursor:** move deliberately and pause on each click target for ~0.3s so the editor cut points are obvious.
- **Audio:** record voiceover separately (quiet room) and lay it over the sped-up video so timing is independent of the live run latency.
