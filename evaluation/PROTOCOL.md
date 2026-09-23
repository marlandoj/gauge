# Gauge evaluation contract v1

This frozen diagnostic contains 80 fresh synthetic tasks in 40 independent scenario groups. Each group contains two paraphrases. Development has 60 tasks in 30 groups; heldout has 20 tasks in 10 groups. Each tier contributes 12 development and 4 heldout tasks. The labels were written by a delegated OpenAI Codex evaluation agent before inspecting any candidate classifier. They are agent-authored judgments, not human-reviewed truth.

## Label rubric

Label the amount and difficulty of reasoning required by the requested outcome, assuming the named existing components are available. Length, alarming nouns, a request for tests, and the number of imperative verbs are not sufficient evidence of complexity.

| Tier | Labeling rule |
| --- | --- |
| trivial | One direct factual lookup or elementary transformation; no implementation decisions. |
| simple | A localized familiar change or isolated function with an explicit outcome. |
| moderate | A bounded feature involving related components or several edge cases, using established contracts. |
| complex | Several interacting systems, migration or concurrency invariants, and consequential failure/recovery behavior requiring design and verification. |
| apex | Open-ended research, novel algorithms or semantics, difficult proof obligations, or establishing feasibility and impossibility limits. |

## Frozen split

Paraphrases share a group and never cross splits. Within each tier, groups are numbered 1 through 8 in the original authoring order. Rank those numbers lexicographically by SHA-256 of UTF-8 text `gauge-split-v1:<tier>:<number>`; the first two groups are heldout. All others are development. The immutable manifest records file SHA-256 values and counts. Group membership is recorded inside each dataset. Files use UTF-8 JSONL with one trailing newline.

Use development labels for implementation and tuning. Freeze the candidate's source revision or complete source-file digests before opening heldout. Run all compared classifiers against the same heldout inputs in one evaluation. Any subsequent candidate edit invalidates the heldout result as independent evidence; disclose it and obtain a new independently labeled cohort for another promotion decision. Do not reassign difficult examples, silently change labels, or evaluate a different candidate on favorable subsets.

The heldout file is intentionally separate. The evaluation author should share paths and hashes with the implementer, but not heldout texts or labels before candidate freeze.

## Measurements

Use the same production classifier exports in CLI, observer and evaluation; no benchmark-specific preprocessing, alternate rules, or label-dependent fallback. Grade both original local and original swarm baselines and the candidate on every case. Retain the raw machine-readable prediction, reason codes, abstention, elapsed time, case ID and classifier revision.

Tier order is trivial=0, simple=1, moderate=2, complex=3, apex=4.

- Confusion matrix: rows are reference tiers; columns are predicted tiers plus an explicit abstain column. Publish counts and denominators, with row totals.
- Exact-tier accuracy: exact non-abstaining matches divided by all examples. Abstention is not correct.
- Per-tier recall: exact matches divided by all reference examples in that tier, including abstentions.
- Complex/apex under-routing: among reference complex and apex cases, count non-abstaining predictions below the reference tier; report count and rate using all reference complex/apex examples as denominator. Report abstentions for those tiers separately.
- Unnecessary escalation: any non-abstaining prediction above its reference tier; report count and rate among all examples, plus the subset escalated by two or more tiers.
- Two-or-more-tier errors: count non-abstaining predictions with absolute tier distance at least two; report count and rate among all examples, with upward and downward components.
- Abstention: count and rate among all examples and per tier. Also report operational fallback accuracy separately when the candidate abstains and preserves a known baseline.
- Cold/warm latency: measure end-to-end CLI and shared-observer overhead, p50 and p95, with sample count, host, versions, warmup policy, cache state and timeout outcomes. Do not compare a warm inner-function timer to a cold CLI.

The original swarm classifier has four tiers and cannot emit apex. Report the five-tier matrix honestly and additionally report a boundary-normalized four-tier comparison where reference apex and any predicted apex map to complex. Keep this secondary comparison labeled; never substitute it silently for the five-tier criterion.

Report task-level and group-level results, since paired paraphrases are correlated. Group exact accuracy requires both paraphrases to be correct. Group error counts mark whether either paraphrase exhibits an error. Twenty heldout tasks represent only ten independent scenarios; avoid significance claims.

## Acceptance and interpretation

Candidate goals are heldout exact-tier accuracy at least each baseline, fewer complex/apex misses than each baseline, and no increase in errors of two or more tiers. Report comparisons separately against both baselines. If a baseline already has zero misses, strict improvement is impossible on this cohort: explicitly report that condition rather than claiming the criterion passed. Abstention cannot be used to hide misses; assess the preserved production fallback as well as raw predictions.

Mechanical preservation, privacy and timeout gates remain mandatory regardless of diagnostic scores. Failure of a quality goal rejects candidate promotion; shadow measurement can remain installed without changing routes. Synthetic results do not authorize live routing. Production promotion requires a fresh human-reviewed cohort and separate operator authorization.

This cohort is deliberately small, English-only and balanced rather than representative of production frequency. It covers programming, operational and theoretical work, with straightforward wording. It does not measure conversational context recovery, malicious prompt robustness, provider quality, or native harness model switching.
