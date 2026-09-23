# Gauge v2 — completed evaluation, promotion rejected

September 23, 2026. ZOU-1684. Version gauge-0.2.0. Routing remains shadow-only.

## Result

V2 scored 15/30 (50%) on 30 fresh, separately authored scenarios. V1 scored 13/30 (43.3%) on those same inputs. This two-case gain is small; no statistical or production-quality claim is warranted. Six of twelve complex/apex tasks were under-routed and one additional apex task was unanswered. The predefined quality gate failed against both raw baseline comparisons. Substituting the local baseline on abstention also failed. Promotion is rejected regardless of development accuracy.

| Measure | V2 | Archived v1 | Current local | Current swarm |
| --- | ---: | ---: | ---: | ---: |
| Exact tier | 15/30 | 13/30 | 9/30 | 11/30 |
| Complex/apex under-routing | 6/12 | 8/12 | 6/12 | 12/12 |
| Complex/apex abstention | 1/12 | 1/12 | 0/12 | 0/12 |
| Errors of at least two tiers | 4/30 | 6/30 | 5/30 | 7/30 |
| All abstentions | 4/30 | 4/30 | 0/30 | 0/30 |

V2 exact recall: trivial 1/6, simple 6/6, moderate 3/6, complex 3/6, apex 2/6. Every diagnostic case has a distinct group, so task and group exact accuracy are equal. Complete matrices, fallback comparisons and the secondary four-tier boundary normalization are in [results-diagnostic.json](results-diagnostic.json). Baseline source/weight digests are recorded there.

The original 8/20 (40%) heldout remains unchanged. Comparing that percentage directly with 50% here would mix different datasets. The controlled comparison is v1 13/30 versus v2 15/30 above.

## Work completed

The operator-approved D01–D25 cohort was validated against its approval packet and rubric. V2 recognizes field extraction, localized setting changes, negative instructions, recovery invariants and formal feasibility requests more broadly. It retains the original deterministic interface, enum reason codes, private receipts and canonical resolver ownership. No classifier provider calls or model-selection table were introduced.

Development: 25/25 approved cases versus v1 11/25; original development 60/60 for both. These are training results. The fall to 50% on different wording remains evidence of overfitting.

Fourteen source, evaluator, protocol and development inputs were frozen at 9:54 AM Arizona before authoring. A separate OpenAI Codex agent, with no conversation history or access to the implementation, read only the two protocols and created six cases per tier. Its manifest was timestamped at 9:56 AM Arizona. The evaluator verified its digest and counts, rejected exact development duplicates/group overlap, checked source digests before and after scoring, and reserved one opening receipt before loading the cohort. No candidate retuning followed. These filesystem checks detect drift but are not tamper-proof attestations.

At scoring time all new labels were agent proposals. The operator has subsequently completed human review and approved all [H01–H30](LABEL-REVIEW.md) labels without corrections; [approval provenance](APPROVAL.md) records the exact decision and source checksums separately. Review followed disclosure of the results, and no independent vendor panel or new blinded evaluation is claimed. Original cohort, manifest and results remain unchanged.

## Remaining failure modes

- Background text before an otherwise elementary request can cause abstention or escalation.
- Words such as “supplied,” “provided,” or “flag” can cause bounded-edit rules to hide a larger feature.
- Difficult migrations and research described without the expected vocabulary can be underrated.
- The category rubric has subjective boundaries; H01–H30 review is complete, and future cohorts still require review.

Further keyword additions should not be promoted from these training scores. A future candidate should evaluate a broader local semantic approach and conservative abstention, use reviewed development labels, freeze before a different independent cohort, and meet the existing gates. Do not tune v2 on H01–H30 and retain its independent-test claim.

## Verification

67 tests passed, zero skipped, with the archived merged ZOU-1685 resolver, working resolver and actual working SwarmOrchestrator supplied. This includes seven-harness canonical delegation, task/role selection precedence, catalog qualification/fallback, actual child-process receipts, privacy, installer idempotence and route preservation. One first full run hit a five-second timeout in an existing process-timing test; it passed in isolation and the full rerun. No timing code or limits were changed to obtain the pass. TypeScript passed. Portable CI is a separate 53-pass suite with 14 explicit external-fixture skips.

Reproduction for a prepared local workspace:

```bash
GAUGE_TEST_SWARM_ROOT=/absolute/merged-release/packages/swarm \
GAUGE_TEST_WORKING_SWARM_ROOT=/absolute/working/packages/swarm \
GAUGE_TEST_CONSUMER_ROOT=/absolute/working/packages/swarm bun run test
bun run typecheck
```

The diagnostic intentionally refuses a second opening or output overwrite. Read committed results to inspect the completed run. A future experiment needs a new version, freeze and cohort. The archived merged fixture used here was the surviving PR #779 archive from the earlier release; it is not a durable runtime dependency.

Twenty new CLI processes measured p50 65.7 ms / p95 68.0 ms; the observer with a new worker, resolver and private receipt measured p50 70.6 ms / p95 74.2 ms. All 20 receipts arrived. Bun 1.3.12, Linux x64, warm filesystem cache; no network/provider calls and no discarded warmups. These end-to-end samples are separate from the warm inner-function timing in the scoring report. See [latency.json](latency.json).

## Preservation and gap audit

| Check | Current evidence |
| --- | --- |
| Reachability | Existing SwarmOrchestrator.resolveModelFor invokes the observer; real shared-consumer tests produce all seven receipts with unchanged route returns. Installer dry run: ALREADY_INSTALLED. No native model picker or independently pinned runtime deployment claimed. |
| Data prerequisites | Approved development snapshot validated; canonical registry entries and catalog fixtures exercised. Missing dependencies abstain. No new pool, model cache or provider needed. |
| Process boundaries | Actual workers receive roots/environment, create private receipts and respect timeout/off/unsupported-mode behavior. |
| Evaluation parity | Frozen production classify and assess exports are used directly. No evaluation-only preprocessing or label-based fallback; both operational fallback comparisons are explicit. |
| Dangling identifiers | No resources removed or renamed. Existing package, observer import and CLI paths still resolve. |

[Preservation evidence](preservation-after.json) confirms thirteen artifacts or archived counterparts retain exact original bytes: v1 classifier, both original datasets/results, original protocol/manifest/freeze/opening receipt, approved labels/review packet, production assessor and shared observer. This continuation made no swarm resolver/catalog/configuration edits. Existing consumers using this source can observe v2 proposals; production model choices remain unchanged. GAUGE_MODE=off still disables observation; live remains unsupported.

The completed deliverable is the frozen v2 experiment and its evidence. Human review of H01–H30 is complete. Remaining promotion work requires a better-generalizing candidate, fresh validation and separate live-routing authorization. Human approval alone cannot turn this failed diagnostic into a pass.
