# Loopsmith — Builder Gate Rubric

The builder grades itself against these criteria. "Done" is model-verifiable with no human:
each criterion maps to a checkable artifact (PLAN.md §3, §8). Threshold to ship: **80/100**.

| # | Criterion | Weight | How the model verifies it (no human) |
|---|-----------|--------|--------------------------------------|
| 1 | Interview → spec | 15 | `loop-spec.json` validates against the `LoopSpec` schema |
| 2 | Architecture synthesis | 10 | All 5 layers present and non-empty in the spec |
| 3 | Repo generation | 20 | Generated repo: `npm test` passes AND `GET /health` returns 200 |
| 4 | One full loop | 15 | Run writes `runs/<ts>/output.md` + `runs/<ts>/gate.json` with a numeric score |
| 5 | Self-improvement is real | 25 | On fixed input, run2 gate score ≥ run1 OR `memory/` gains a non-empty learning |
| 6 | Self-looping | 10 | ≥2 runs in the timeline triggered by the scheduler, not a button |
| 7 | No architecture knowledge required | 5 | Walkthrough contains zero technical inputs from the user |

## Output quality rubric (used by the generated loops' own gate)

The default rubric Loopsmith writes into each generated loop. The interview tunes the weights.

- **Clarity (25):** a non-technical reader knows exactly what to do.
- **Actionability (25):** every item has a concrete next action, owner, and artifact.
- **Signal selection (20):** the chosen items are the ones that actually matter; noise dropped.
- **Grounding (20):** claims trace back to real ingested signals, not invention.
- **Brevity (10):** no filler; respects the reader's time.

Below 80 → the gate revises (bounded retries) or holds the item for human review.
