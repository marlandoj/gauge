# Gauge baseline and resolver contract

Captured 2026-09-23T08:25:01.509591-07:00 (Arizona), before Gauge source implementation. Workspace HEAD: `26606d22f6f6510658fb9eec5b850d733a620b9c`. ZOU-1685 merged release: `260f6be6ff4b8489a5db45517082168a06f53ce7` (PR 779). These are content digests only; no private task, feedback text, credential, or model-provider request is included.

The separate tier-resolver repository HEAD is `5be7af8e299cec0c8b305248d23ed9b03314100e`; its skill, feedback, model configuration, routing scripts, and policy test have pre-existing local changes. Gauge preserves them.

## Source evidence

| Source | Working SHA-256 | Release SHA-256 |
| --- | --- | --- |
| `Skills/tier-resolver/scripts/persona-tier-resolve.ts` | `9b342cfc2737be0174b318708db46582b07a99852b64eec1452b1e5ca50346ac` | `not applicable (separate skill repository)` |
| `Skills/tier-resolver/data/weights.json` | `e6d39a847e4c89292d7bed27f2e2632e3b27bbfbc331e3477aee248fee0cd332` | `not applicable (separate skill repository)` |
| `Skills/tier-resolver/data/models.json` | `5016afd1bc59442d80f673f1dc55fdf556d26e6a70d9ea47ca989466417c1f65` | `not applicable (separate skill repository)` |
| `Skills/tier-resolver/data/feedback.jsonl` | `39d62a6e709b4fad80726c133c47c7b9cdd6b78beb95fdb51774734fff6d38ac` | `not applicable (separate skill repository)` |
| `packages/swarm/src/selector/executor-selector.ts` | `98d2a2bb72dfe994cd04e9721eedbd0cd6c964ac6910a3ab24b5386b5b0067c0` | `98d2a2bb72dfe994cd04e9721eedbd0cd6c964ac6910a3ab24b5386b5b0067c0` |
| `packages/swarm/src/routing/model-router.ts` | `2fc60ede0b7d837f0695140464939b7bc496eaddf73a7465778e921952facb63` | `b2f80351d36d47e5a0199c1897e11b0895a1b2b614b4adf734642570aeef27f2` |
| `packages/swarm/src/routing/model-catalog.ts` | `710a76554df0e43d68116374877c29f5715b6b23cab191945e5e9c7cc6c2e9aa` | `de66ec88cbd602c67a2963823ff86563b6fea3c8432fc972fa8e92f2e6b39e91` |
| `packages/swarm/src/registry/loader.ts` | `a88f1281c421e832d57b9de7b05d31f25b7ce6238662af8e3d28f379e3bae64a` | `8550844ef7519b51621c01bf38e04173f00f5bea6893013db0433078c879b98d` |
| `packages/swarm/src/executor/registry/executor-registry.json` | `c31976c7446fced8f6d1ee4c144ac66d8e1104328e75b650e17049ff4b8fe623` | `4ef587cfb43b7ac4fbfd365d79e7742d7cac924cbad3db1c0b90295869211f17` |
| `packages/swarm/src/orchestrator.ts` | `ed5ba6d41f399fd7acb4a8ab643dc5a851a9c1c97e4468399881d04851f124de` | `272e582027fec1d80f14d080aa857d2fa283844516b78ab27339d36511d159df` |

## Baseline classifiers

The swarm `inferComplexity` in `src/selector/executor-selector.ts` uses task character length only: below 100 is trivial, below 300 simple, below 800 moderate, otherwise complex. It returns four tiers.

The local `estimateComplexity` in `Skills/tier-resolver/scripts/persona-tier-resolve.ts` loads local weights then calls `_estimateCore`. Its synchronous export uses cached/default weights. It uses weighted task features, task-type and scope rules, and explicit apex signals; it returns five tiers. Gauge evaluation must identify async loaded weights versus sync defaults. No feedback tuning or promotion is authorized by this baseline record.

## Canonical resolver API

Dynamically import `src/routing/model-router.ts` and `src/registry/loader.ts` from the configured swarm root. `loadRegistry(customPath?)` returns `{ executors }`; use its real executor entry (and `findExecutor`) rather than copying model tables. The release loader exports `resolveExecutorRegistryPath(customPath?, workspaceRoot?, env?)`; override precedence is explicit path then `SWARM_EXECUTOR_REGISTRY`, with workspace roots resolved through supplied root, `SWARM_WORKSPACE`, or `ZOUROBOROS_WORKSPACE_ROOT`.

Call `resolveModelForExecutor(task, harness, tier, entry, roleModel)` with copied task/entry objects. Convert apex to complex only at this boundary. Catalog buckets are trivial/simple → light, moderate → mid, complex/apex → heavy. Exact task models override role models. Registry pins override catalog picks. Pins are operator selections, not claims of catalog qualification. Alias requests preserve the canonical resolver's tier precedence. Null results mean no proposal.

`readBestModelCatalogSync(path?, now?)` reads current catalog and falls back to last-known-good when current is absent/stale. `resolveCatalogModel` selects the qualification record's model only when the catalog is fresh and the record qualified; missing/stale/unqualified catalog uses canonical floors. Structural JSON validity is not fully checked by the catalog reader: downstream errors must yield Gauge abstention. Never fill these gaps with a Gauge model table.

## Release reconciliation boundary

At capture, the live working tree is not equivalent to merged PR 779. Release has requested-model alias tier handling, environment catalog path support, richer static-floor fallback, and centralized registry path resolution absent from the live source. Live orchestrator also lacks release routing-signal wiring and completion feedback. There are unrelated dirty swarm and tier-resolver files.

The primary agent owns reconciling this boundary before editing the shared consumer. Contract tests should use the canonical modules from the reconciled release checkout via a configured path and synthetic catalog files. Do not overwrite dirty live files, promote catalogs, execute real models, or infer that a successful import establishes deployed release parity.

## Required contract coverage

- All seven real executor entries, and explicit apex → complex conversion.
- Exact task and role model precedence; registry pins; alias requests.
- Fresh qualified catalog route, unqualified winner, stale current with valid last-known-good, missing catalog, malformed JSON, and structurally malformed catalog.
- Missing dependency or entry, null resolver result, import error, and timeout abstain without substituting a model.
- Input objects remain unchanged and shadow output returns the exact baseline route under successful, failed, and timed-out observation.
- Evidence distinguishes synthetic contracts from completed native harness sessions.

## Contract execution evidence

`tests/contracts/resolver.test.ts` passed 34 tests with 222 assertions against both the isolated merged release and the working swarm source. Gauge TypeScript checking passed. The release tests use synthetic catalog files under temporary storage and restore process environment overrides; they never write the live registry or catalog. The working-source check is read-only and covers 42 task/role alias combinations across seven real executor entries.

Run with `GAUGE_TEST_SWARM_ROOT` pointing to a checked-out or archived merged swarm package and `GAUGE_TEST_WORKING_SWARM_ROOT` pointing to an optional working package. Without these variables, external integration suites are explicitly skipped while the portable adapter tests run. They are not bundled copies of the canonical resolver.

Evidence establishes API compatibility and preservation for both source versions; it does not establish deployment parity with PR 779, completed native harness model sessions, or promotion eligibility. Gauge freezes the tier supplied to the resolver for explicit task/role selections so even the older resolver's alias behavior is unchanged. Structural catalog exceptions and missing dependencies yield abstention. Shared-observer timeout and unchanged production return tests belong to the primary integration workstream.
