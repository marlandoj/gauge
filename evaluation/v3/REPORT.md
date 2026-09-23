# Gauge v3 — fresh diagnostic complete, promotion rejected

September 23, 2026. ZOU-1684. Gauge 0.3.0. Routing remains shadow-only.

## Result

V3 scored **24/40 (60%)**, versus archived v2 **19/40 (47.5%) on the same fresh cases**. Local baseline: 12/40; swarm baseline: 18/40. This is five additional correct classifications on a small synthetic cohort, not a production-quality or significance claim. The earlier v2 result of 15/30 belongs to a different dataset and remains unchanged.

| Measure | V3 | V2 on these cases | Local | Swarm |
| --- | ---: | ---: | ---: | ---: |
| Exact tier | 24/40 | 19/40 | 12/40 | 18/40 |
| Complex/apex under-routing | 5/16 | 7/16 | 8/16 | 16/16 |
| Complex/apex abstention | 1/16 | 2/16 | 0/16 | 0/16 |
| Errors of at least two tiers | 6/40 | 7/40 | 8/40 | 8/40 |
| All abstentions | 6/40 | 9/40 | 0/40 | 0/40 |

The unchanged quality gate **fails** because of the complex-task abstention. Both separately reported fallback comparisons pass, scoring 26/40 after substituting their own baseline on abstention. That does not override the failed raw-candidate requirement. No fallback routing was enabled. Five apex under-routes and six severe errors also show substantial remaining weakness.

V3 exact recall: trivial 2/8, simple 6/8, moderate 6/8, complex 7/8, apex 3/8. All 40 groups are distinct, so group exact accuracy equals task accuracy. Complete matrices, reasons, secondary four-tier normalization and comparisons are in [results-diagnostic.json](results-diagnostic.json).

## Development and provenance

Approved H01–H30 became development material for this new version, alongside the 60 original development tasks and approved D01–D25. They are never described as unseen v3 validation. The original holdout was not used for tuning. Final development: 114/115 versus v2 100/115 (60/60 original, 25/25 D, 29/30 H). These are training results. The earlier 115/115 development snapshot predates code-review corrections; [PREFLIGHT.md](PREFLIGHT.md) explains the distinction.

A separate bounded agent tested twelve local TF-IDF configurations with grouped folds and whole-cohort exclusion. The best grouped result was 94/115 with severe regressions on simple tasks. The standalone alternative was rejected; see [experiment and limitations](lexical/REPORT.md). Its portable script reproduces all retained predictions and metrics. The shipped classifier remains deterministic rules with no provider calls or model downloads.

Source changes improve background-context handling, literal transformations, feature scope and formal-analysis signals. Bounded review caught quoted requirements being erased, analysis requests becoming lookups, unavailable-resolver parity and zero-receipt accounting. Fixes and regression tests preceded freeze. Review did not involve a different model vendor or a specialist model call; persona-consult remained shadow-only.

At **10:34 AM Arizona (17:34:43Z)**, 17 source/input files and three baseline files were frozen. A separate Codex agent without parent history read only the original rubric and v3 protocol, then authored 40 tasks in 40 groups, eight per tier. Its manifest records **10:37 AM Arizona (17:37:45Z)**. The scorer checked digests, balance, rationales, duplicate/group overlap, baseline stability and actual assessor parity, then scored once. A second opening was refused with all five cohort/result/receipt artifacts unchanged. String checks cannot prove semantic independence, and local hashes are not tamper-proof attestations.

At the original diagnostic release, N01–N40 were proposed labels pending human review. The operator subsequently completed [LABEL-REVIEW.md](LABEL-REVIEW.md): 39 accepted and N09 corrected from trivial to simple. [Approval provenance](APPROVAL.md) records all decisions. The original metrics above remain historical; reaggregating saved predictions against the reviewed labels gives v3 **23/40 (57.5%)**, archived v2 19/40, local 13/40 and swarm 19/40. The raw quality gate still fails. No original dataset, prediction, rubric or frozen source changed, and no new blinded evaluation is claimed.

## Verification and latency

77 tests passed with zero skips using merged ZOU-1685, working resolver and actual shared-consumer fixtures. TypeScript passed. Coverage includes seven harnesses, explicit selections, pins, qualification/fallback, actual worker receipts, privacy, timeout/off/live rejection, installer idempotence, frozen evidence and evaluation parity. Portable CI has 63 tests and 14 explicit external-fixture skips. No full monorepo or seven native-provider session pass is claimed.

Twenty fresh CLI processes measured p50 66.6 ms / p95 75.9 ms; the observer including its worker and private receipt measured p50 72.9 ms / p95 81.0 ms. All 20 receipts arrived. One CLI launch took **6,080.2 ms** despite its nominal 2,000 ms child timeout; the outlier remains included and no cause is asserted. OS scheduling/process launch is not a hard real-time bound. Bun 1.3.12, Linux x64, warm filesystem cache, no discarded warmups or provider calls. See [latency.json](latency.json).

## Preservation and gap audit

| Check | Evidence |
| --- | --- |
| Reachability | Actual SwarmOrchestrator consumer test returns unchanged models and emits all seven receipts. Installer dry run: ALREADY_INSTALLED. Native pickers and pinned/loaded runtimes were not redeployed. |
| Data prerequisites | D and H approvals/digests validated, canonical resolver entries exercised; no new cache, pool or credentials. Missing resolver now stops scoring. |
| Process boundaries | Real worker tests preserve roots/environment, private receipts, off/live rejection and timeout behavior. |
| Evaluation parity | Frozen production classify and assess run directly; unexpected assessment abstention or missing route fails scoring. Both raw and fallback metrics disclosed. |
| Dangling identifiers | No resources removed/renamed. Installed observer matches repository bytes and all caller/import paths exist. |

[Preservation evidence](preservation-after.json) verifies historical files and all fourteen v2 frozen inputs, substituting the byte-identical archived classifier for the newer production source. V1/v2 results, labels, approvals and opening receipts are unchanged. Resolver, catalog and observer source were not edited.

The experiment and human label review are complete; promotion remains rejected. Remaining failures include elementary requests phrased without expected verbs, formal research taking bounded-edit/lookup branches, and a rollout request lacking recognized systemic wording. Do not patch those cases into frozen v3 or reuse N01–N40 as an unseen test. Further work needs a separately frozen candidate and fresh evaluation; more keyword coverage alone is insufficient. Separate live-routing authorization remains required.
