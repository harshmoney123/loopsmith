# Loopsmith — 60-Second Demo Recording Script

> "The Chief of Staff that builds your Chief of Staff." Scenario: the **fundraise / deal pipeline** —
> the same loop a solo founder runs to manage a raise and a VC runs for deal-flow. Interview →
> design a self-improving loop (sensor → policy → tools → gate → learning) → the gate **holds**
> weak output → it learns the operator's preference → the score **climbs** → hand them a
> downloadable Claude Code repo.

**Live URL:** https://loopsmith-sepia.vercel.app · record `/build`.

---

## 0. SAFETY — already done (don't skip)

The public site previously read a real connected Slack (it surfaced real names + SEO reports). For
the demo + submission we **removed `SLACK_BOT_TOKEN` from Vercel production**, so runs now use
synthesized/sample fundraise signals only — **no real personal data on camera.** Verified clean.
(If you ever want live connectors back, re-add the token; don't do it before recording.)

---

## 1. TL;DR

**Record ONE page: `/build`.** The whole arc — describe → interview → spec → live run → gate
**holds** → teach a preference → re-run → score **climbs** → **download the repo** — happens inline
with zero navigation.

> ⚠️ **Reality check:** after the interview the loop does **not** auto-run. It shows a **spec card**;
> you click **"Run on a sample week"** to start the run inline. The run uses synthesized fundraise
> signals (fictional investors) — coherent and safe.

**Measured live (numbers vary ±a few, but the held→pass shape is guaranteed):**
| Beat | Time | Result |
|---|---|---|
| Interview (≈4 questions) | ~25s | spec card renders |
| Run 1 (cold, no memory) | ~20s | **~75 / HELD** (below 80) |
| Run 2 (after a taught preference) | ~15s | **~91 / PASSES** |
| Download (.zip) | ~1s | runnable repo |

Raw ≈ 90–110s with clicks. **Record it all, then speed the three "Thinking" gaps 3–4× and jump-cut
dead air** to land under 60s. Keep the **75 → 91** score chips and the climbing **"Fit to operator"**
bar near real-time so the payoff reads.

---

## 2. Exact recording walkthrough

The interview is server-generated (non-deterministic) — **click the first chip each time**; it
reliably finishes in ~4 questions with a clean fundraise spec. Numbers below are the verified shape
(~75 held → ~91 pass).

| Timecode | ACTION (verbatim labels) | WHAT APPEARS | VOICEOVER |
|---|---|---|---|
| 0:00–0:05 | Open `/build`. | Heading **"What should run itself for you?"**, three example chips, input placeholder **"Describe what should run itself for you…"**, top-right **"Build a loop · Opus 4.8"**. | "This is Loopsmith — the Chief of Staff that builds *your* Chief of Staff." |
| 0:05–0:09 | Click the first example chip: **"Turn my investor emails, intros and call notes into the few relationships to move on this week, and draft the follow-ups."** | Your text appears as a bubble → **"Thinking"** dots → first interview question with answer chips. | "I describe what I want in plain English — running a raise is pure pipeline pain." |
| 0:09–0:23 | Click the **first chip** on each of the ~4 questions. | Four Q&A turns stream in (where the signals live, cadence, output, approvals). | "It interviews me like a chief of staff would — just business questions, no prompts." |
| 0:23–0:28 | (No click — spec card renders.) Hover it. | **Spec card** badge **"Your loop"** + a fundraise loop name; rows **"Listens to"**, **"Decides"**, **"Produces"**, **"Checks against 5 quality standards (ships ≥ 80/100)"**; rubric chips incl. **"Fit to operator · 25"**. | "It designs the whole loop — where to listen, what matters, and a bar to grade itself." |
| 0:28–0:30 | Click **"Run on a sample week"**. | Five stage cards begin streaming. | "Now watch it run — live." |
| 0:30–0:36 | (Watch.) **"Listening"** → **"Deciding"** (Opus 4.8). | **Listening**: ingested investor signals (warm intros, an investor gone quiet, a pitch-call asking for metrics, an angel ready to commit). **Deciding**: streamed reasoning (longest gap — speed in edit). | "It pulls the week's investor threads and decides which relationships actually move the round." |
| 0:36–0:42 | (Watch.) **"Acting"** → **"Checking"** (Opus 4.8). | **Acting**: drafted follow-ups, each tagged **"dry-run"**. **Checking**: score chip **~75/100** + **"below bar — held for review"** (red) + per-criterion bars, **"Fit to operator"** low. | "Here's the magic — the gate **holds it**. Seventy-five, below the bar. It refuses to ship generic follow-ups." |
| 0:42–0:45 | (Watch.) **"Learning"** finishes; **"Make it yours"** panel appears. | **Learning**: *"✎ wrote N lesson(s) to memory…"*. Panel header **"Make it yours"** + textarea. | "And it writes down what it learned." |
| 0:45–0:50 | In **"Make it yours"** paste: **`Always lead with our latest traction metric, and flag any investor who's gone quiet for over a week.`** Click **"Teach & re-run"**. | Run restarts; stages re-stream (~15s — speed in edit). | "I teach it one preference — lead with the traction number, chase the quiet ones — and re-run." |
| 0:50–0:55 | (Watch **"Checking"** on run 2.) | Score chip **~91/100** + **"passes the gate — ships"** (green); **"Fit to operator"** bar visibly higher. | "Same loop, now ninety-one — it passed. It learned *me*, and the score climbed." |
| 0:55–0:59 | In the post-run footer (**"This loop is yours to keep —"**) click **"Download project (.zip)"**. | Button → **"Zipping…"** → downloads the repo `.zip`. | "Then it hands me the whole thing — a runnable Claude Code repo." |
| 0:59–1:00 | Cut to Finder: the unzipped repo (15 files: `loop-spec.json`, `CLAUDE.md`, `engine/`, `tests/…`). *(Optional: terminal `npm test` green.)* | the repo folder | "Mine to keep, mine to run. That's Loopsmith." |

**Interview fallback (if chips don't render):** click the bottom input bar and type answers + Enter,
e.g. `Email and recorded calls` → `Every Monday` → `The 2-3 relationships to move on + drafted follow-ups` → `Always draft for my review`.

---

## 3. The two judge beats

**(a) "You directed Claude + it verified itself."** The **"Checking"** stage (Opus 4.8) showing the
**~75/100** score + rubric bars — you only typed plain English; Claude designed the rubric *and*
graded its own output against it. Reinforce with the spec card's **"Checks against 5 quality
standards (ships ≥ 80/100)."**

**(b) "It caught and fixed its own failure live."** **~75 / "below bar — held for review" (red)** →
teach a preference → **~91 / "passes the gate — ships" (green)**, with the **"Fit to operator"** bar
climbing between the two runs. Failure detected and corrected on camera — linger here, it's the money
shot.

---

## 4. Pre-flight checklist (do once, right before recording)

1. **Confirm Slack token is OFF prod** (done) — runs must show fictional investors, never real names.
   Quick check: do one throwaway `/build` run and confirm the signals are investor-themed and contain
   nobody you recognize.
2. **Warm the server**: hit `/api/health` (expect `{"status":"ok"…}`) and do one full throwaway run so
   the recorded run is the warm ~15–20s path, not a cold spike.
3. **Confirm the arc**: run 1 lands **below 80 / held**, after **"Teach & re-run"** it climbs **above
   80 / pass**. Exact integers vary; the **held → pass** shape is guaranteed by the deterministic Fit
   score. Re-roll the throwaway until you see it cleanly.
4. **Pre-copy the preference line** (paste, don't type on camera):
   `Always lead with our latest traction metric, and flag any investor who's gone quiet for over a week.`
5. **Test the download once**; keep the unzipped folder open in Finder for the closing cut. Clear old
   `.zip`s from Downloads.
6. **AVOID on camera:** the **"Run on my real data"** / connector paths — stick to **"Run on a sample
   week."** Don't refresh mid-demo. Don't type during a run (input is hidden while streaming, by
   design). Keep the preference note ≥ 3 chars (button is disabled below that).

---

## 5. Backup plan

1. **Best fallback — keep the warm-up take.** Screen-record the pre-flight warm-up run; if the on-stage
   run stalls, cut to the pre-recorded **held → teach → pass** segment. Identical flow, invisible cut.
2. **Console fallback** (`/`): the Console runs the **fixed** sample week (Maya/Lightfield, Acme gone
   quiet, the angel) — slightly more concrete signals if you want a scripted set. Same held→climb.
3. **Spec + download only:** if a run dies, narrate over the **spec card** (fast `/api/interview`, no
   stream risk) + the **download** (deterministic, instant) and drop in the pre-recorded run clip for
   the gate beat.
4. **Terminal proof (optional cutaway):** `npm test` in the unzipped repo (offline `node --test`), or
   `curl -X POST .../api/workflow` for the per-stage verifiable exits. Cutaway only, not the main beat.

---

## 6. Recording setup

- **Tool:** macOS **Cmd + Shift + 5** → "Record Selected Portion" (fixed region, not full screen).
- **Window:** browser **1280 × 800**; **zoom 110–125%** so the **75/100 → 91/100** chips and the
  **"Fit to operator"** bar are unmistakable on a projector.
- **Theme:** light mode. **Hide chrome:** bookmarks bar off, other tabs closed, Dock auto-hidden, Do
  Not Disturb on.
- **Cursor:** pause ~0.3s on each click target so edit cut-points are clean.
- **Audio:** record voiceover separately and lay it over the sped-up video (timing independent of run
  latency).
- **Upload:** YouTube (unlisted is fine) → paste the link into the submission form + `SUBMISSION.md`.
