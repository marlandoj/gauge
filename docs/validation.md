# Validation — September 23, 2026

## Disposition

The shadow instrumentation and package pass their targeted mechanical checks. **The classifier candidate is rejected for promotion.** Automatic routing is not implemented or enabled. ZOU-1684 supplies assessment; ZOU-1685 continues to own discovery, qualification, model selection and promotion.

## Frozen diagnostic

80 fresh agent-authored synthetic tasks were grouped into 40 paired-paraphrase scenarios, then split into 60 development tasks and 20 held-out tasks. A delegated evaluation author did not inspect the classifier. The candidate source was frozen before the one-time held-out evaluation. It has not been changed since. This is a small English-only diagnostic, not human labeling or a production benchmark.

| Held-out measure | Gauge | Existing local classifier | Swarm length classifier |
| --- | ---: | ---: | ---: |
| Exact tier | 8/20 (40%) | 5/20 (25%) | 4/20 (20%) |
| Complex/apex under-routing | 4/8 | 8/8 | 8/8 |
| Complex/apex abstentions | 2/8 | 0/8 | 0/8 |
| Two-or-more-tier errors | 2/20 | 7/20 | 8/20 |
| All abstentions | 6/20 | 0/20 | 0/20 |
| Unnecessary escalation | 1/20 | 0/20 | 0/20 |

Gauge's exact recall on complex tasks is 0/4. With a baseline substituted at abstention, exact accuracy is 10/20 and complex/apex under-routing is 6/8. The evaluator's conservative acceptance check rejects complex/apex abstention, so raw-candidate acceptance fails despite passing the three comparative goals. These weak absolute results independently justify retaining the current route. Development accuracy was 60/60; the held-out drop exposes generalization failure. No tuning on the opened held-out set followed. Fresh, human-reviewed tasks and separately authorized promotion are required next.

Full confusion matrices, per-tier recall, grouped results and the explicit four-tier boundary comparison are in `evaluation/results-heldout.json`. The four-tier comparison maps both expected and predicted apex to complex; it is not substituted silently for exact five-tier results.

## Mechanical checks

- 47 Gauge tests passed with all three external test roots configured: portable logic, real resolver contracts, private receipt recovery, system timeout cleanup, installer idempotence, metrics, and the actual shared consumer.
- All seven real registry entries passed canonical resolver parity. Explicit task/role models and aliases preserve existing behavior; registry pins are not described as qualified.
- The installed working consumer and the isolated merged-release consumer both returned original models and generated seven synthetic routing receipts across a real process boundary. No provider calls were made.
- 34 affected merged-swarm tests passed (resolver, catalog, selector and orchestrator fallback).
- Gauge TypeScript, working swarm TypeScript, merged swarm TypeScript and compilation to disposable scratch passed.
- Original local baseline regression remains 84% tier / 68% task type, matching its required floors. Its results were written only to scratch.
- A broader archive-only swarm run did not pass: 503 passed, 7 failed and 5 errors, including missing monorepo fixtures and a 90-second unrelated structured-output test timeout. This is not reported as a full-suite success. Validation was narrowed to affected suites after correcting the archive dependency setup.

## Latency

20 fresh CLI processes on this host, Bun 1.3.12, warm filesystem cache: p50 64.1 ms / p95 67.1 ms. The shared observer including process startup, resolver, private receipt and timeout wrapper measured p50 69.8 ms / p95 75.9 ms; all 20 produced receipts. These are process-cold measurements, not a cold filesystem or network benchmark. The warm inner classifier measured p50 0.025 ms / p95 0.082 ms on the held-out set; it is not advertised as end-to-end latency. The worker timeout is 250 ms plus OS scheduling/launch overhead, with a secondary launch bound. See `evaluation/latency.json`.

## Review and gap audit

Bounded peer review found two interruption defects: a stale exclusive lock could disable future logging, and direct key creation could publish a partial key. Both were fixed. A killed-owner regression passed after switching append serialization to a SQLite transaction; key publication now atomically links a completed private temporary file. The reviewer accepted the fixes and found no further concrete defect. Specialist persona routing was shadow-only; it is not an independent model-consensus approval.

| Check | Evidence |
| --- | --- |
| Reachability | Installer changes the actual `SwarmOrchestrator.resolveModelFor`; tests invoke that method for all seven harnesses. Native interactive sessions require explicit CLI use. Existing loaded/pinned runtimes are not silently deployed. |
| Data prerequisites | Canonical registry and resolver imports tested; missing/invalid dependencies abstain. Digest key bootstraps atomically. No new model pool or copied table. |
| Cross-boundary state | Actual child processes receive canonical roots and environment, write private receipts, and are killed by system timeout. |
| Evaluation parity | CLI, observer worker and evaluation all import `src/classifier.ts` and use `assess`; source hash is frozen. |
| Dangling identifiers | No resources renamed or removed. Installer/source imports point to the existing Gauge package and copied observer. |

## Preservation and release boundary

The approved release baseline is PR #779 merge `260f6be6ff4b8489a5db45517082168a06f53ce7`. Its resolver differs from this host's older working source; Gauge tests both and modifies neither. The only swarm source changes are the observer module and the small `resolveModelFor` integration. The canonical package owns all remaining behavior.

The original tier-resolver source, weights and models remain byte-identical to the initial digests. The private feedback file gained one row during execution; its entire original byte prefix is intact. Gauge never reads feedback or appends to it, and the row's contents were not copied into this repository. Concurrent ownership is not inferred from a changed hash.

Rollback backup on this host: `/home/workspace/Backups/gauge/orchestrator-ed5ba6d41f399fd7.ts`. Set `GAUGE_MODE=off` to disable observation. Preserve later edits when applying source rollback.
