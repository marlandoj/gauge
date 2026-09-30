# Program: gauge-tier-routing

## Objective
Eliminate complex/apex under-routing and all complex/apex abstention in Gauge's local
deterministic classifier until the four-check acceptance gate passes against the pinned v3
baseline, without regressing exact accuracy or adding severe errors.

## Metric
- **name**: gauge_acceptance_composite
- **direction**: lower_is_better
- **extract**: `bun evaluation/autoloop/score.ts 2>/dev/null`

The scalar is lexicographic and lower is better:

```
failed_checks * 100000          # any acceptance-gate failure dominates everything
+ complex_apex_abstention.count * 1000
+ complex_apex_under_routing.count * 100
+ two_or_more_tier_errors.count * 10
+ round((1 - accuracy) * 1000)  # tie-break only
```

Currently 19 (0 gate failures on the 115-case dev cohort). Any edit that raises the score is a regression.

## Setup
```bash
cd /home/workspace/Projects/gauge
bun install
# The pinned baseline is already committed at evaluation/autoloop/baseline-classifier.ts.
# It is a frozen copy of src/classifier.ts at v3 and must never be regenerated.
bun evaluation/autoloop/score.ts 2>&1 | tail -20
```

## Target File
src/classifier.ts

## Run Command
```bash
cd /home/workspace/Projects/gauge && bun evaluation/autoloop/score.ts
```

## Read-Only Files
- evaluation/autoloop/score.ts
- evaluation/autoloop/baseline-classifier.ts
- evaluation/metrics.ts
- evaluation/review.ts
- evaluation/PROTOCOL.md
- evaluation/v3/PROTOCOL.md
- evaluation/v3/classifier-v2.ts
- evaluation/v3/run.ts
- evaluation/development.jsonl
- evaluation/development-reviewed.json
- evaluation/review-packet.json
- evaluation/v2/cohort.json
- evaluation/v2/label-approval.json
- evaluation/v3/results-diagnostic.json
- evaluation/v3/cohort.json
- evaluation/v2/results-diagnostic.json
- src/assess.ts
- src/receipts.ts
- scripts/gauge.ts
- integrations/task-assessment-observer.ts
- autoloop.program.md

## Constraints
- **Time budget per run**: 3 minutes
- **Max experiments**: 24
- **Max duration**: 6 hours
- **Max cost**: 15.00

## Simplicity Criterion
Prefer deleting or narrowing a rule over adding one. Every additional keyword is a
generalisation risk, and v2 already failed promotion by overfitting 25 approved cases.
A smaller rule set that hits the same composite is a win, not a neutral outcome.

## Stagnation
- **Threshold**: 6 experiments with no improvement triggers radical exploration
- **Double threshold**: 12 experiments combines best past approaches
- **Triple threshold**: 18 experiments auto-stops with summary report

## Notes
The binding constraint is NOT accuracy. Gauge v3 already scored 24/40 (60%) on a fresh
blinded cohort, the best result in the repo's history, and was still rejected for promotion
because it abstained on exactly one complex task. The acceptance gate is four checks:

1. accuracy at least baseline
2. strictly fewer complex/apex under-routes than baseline
3. no increase in errors of two or more tiers
4. zero complex/apex abstentions

Check 4 is an absolute zero, not a trend. A single abstention on a complex or apex task fails
the entire gate no matter how good everything else is.

Root causes documented across the v2 and v3 reports, in priority order:

- Under-routing dominates. 5 of 16 complex/apex tasks were under-routed in v3, and 69
  severe two-tier errors appear when the classifier degenerates. Bias is toward low tiers.
- Background or preamble text before an otherwise elementary request causes escalation or
  abstention. The v2 report names this explicitly.
- Words like "supplied", "provided" or "flag" make bounded-edit rules hide a larger feature.
- Difficult migrations and research described without expected vocabulary get underrated.
- v3 raised total abstention to 6/40. Escalating is safer than under-routing, but a
  classifier that abstains on complex work is worse than one that over-routes it.

Hard rules for this loop:

- Tune only against the 115 dev cases the scorer assembles (60 original + 25 D + 30 H).
  Never tune against any scored cohort. A dev-only gain does not transfer.
- After any accepted improvement, run `bun evaluation/autoloop/score.ts --folds 5` and check
  the per-fold spread. A wide spread means the rule learned the dev set rather than the task,
  and the change must be reverted even if the composite improved. The scorer prints a WARN line
  when this happens; treat that warning as a veto.
- Keep the classifier deterministic. No provider calls, no model downloads, no network, no
  TF-IDF or embedding dependency. The v3 lexical experiment is documented and rejected.
- Keep the exported interface stable: `classify(value: unknown): Assessment`, the `Assessment`
  shape, and the existing `TIERS` / `HARNESSES` exports. Resolver ownership does not move here.
- Every rule added must come with a regression test in `test/` that fails before the change.
  Run `bun run test && bun run typecheck` before declaring an experiment accepted; a change
  that improves the composite while breaking the suite is a regression.
- Bump `VERSION` in `src/classifier.ts` when a change is accepted.
- Do not edit `src/assess.ts`. If a fix seems to require it, the classifier boundary is
  wrong and the change must be rejected rather than taken.

When the loop finishes, do not merge. Report the best composite reached, the fold spread at
that point, the diff, and whether the four-check gate passed on the dev cohort. Promotion
requires a fresh independently authored cohort and human label review under the v3 protocol;
a dev-cohort pass is necessary but not sufficient.