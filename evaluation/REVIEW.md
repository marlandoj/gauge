# Gauge development label review

Status: awaiting human review. All 25 proposed labels below are agent-authored. No label has been accepted on the operator's behalf. This packet has not been scored against Gauge.

This is a development cohort for diagnosing generalization, with five proposals per tier. Its author and implementer can see every case, so it cannot become an independent holdout, even after human review. It is synthetic and balanced rather than a sample of production traffic. No user prompts or confidential records were copied here.

## Review instructions

Read the task and proposed reason, then accept, correct or dispute the tier. You can respond with case IDs and corrections, for example: `D09 moderate: the wording requires cross-component behavior`. To accept every proposed label, explicitly say `Approve the proposed labels for Gauge D01–D25`. A general request to continue does not approve labels. Disputed or incomplete cases cannot be frozen.

Judge the reasoning the outcome requires, assuming the named existing components are available. Do not raise a tier solely for a sensitive topic, a long prompt, requested tests, or the cost of getting it wrong. Labels are judgments rather than objective model requirements. If the task lacks enough context, dispute it instead of inventing assumptions.

| Tier | Rubric |
| --- | --- |
| trivial | Direct lookup or elementary transformation with no implementation decisions. |
| simple | Local familiar change or isolated function with an explicit outcome. |
| moderate | Bounded feature involving related components or multiple edge cases under established contracts. |
| complex | Interacting systems, migration or concurrency invariants, and consequential recovery behavior needing design and verification. |
| apex | Open research, novel algorithms or semantics, difficult proofs, or establishing feasibility limits. |

The authoritative rubric is the unchanged [original protocol](PROTOCOL.md). Each machine-readable packet records its checksum. Topic and prompt-length contrasts share a group, so future splits must keep those groups together.

## Proposed cases

| ID | Group | Task | Proposed tier | Reason |
| --- | --- | --- | --- | --- |
| D01 | status-change | Read the supplied service status JSON and return the value of its ready field. | trivial | Extract one named field; no diagnosis is requested. |
| D02 | security-config | Find the configured retry count in the supplied authentication client settings and report it. | trivial | A security-related noun does not change a direct lookup. |
| D03 | time-conversion | Convert 21:30 UTC on September 23 to Arizona time. | trivial | A fixed-offset time conversion. |
| D04 | csv-export | In the supplied CSV header, report the position of the invoice_id column, counting from one. | trivial | A direct position lookup. |
| D05 | status-change | Please inspect the attached service status JSON. I need the literal value of the ready property. Return only that value in lowercase. Preserve its meaning, make no configuration changes, and do not diagnose the service or propose repairs. | trivial | The longer wording still asks only for one field. |
| D06 | status-change | Change the existing status endpoint to return the supplied ready flag instead of the constant true; keep its response schema. | simple | A localized replacement with specified behavior. |
| D07 | security-config | In the authentication client, change the retry count from two to three and update its existing unit-test expectation. | simple | A known configuration change and matching assertion. |
| D08 | csv-export | Write a pure function that escapes one CSV field: double embedded quotes and quote fields containing a comma, quote or newline. | simple | A small isolated function with a complete contract. |
| D09 | theme-preference | Rename the existing display setting from Night mode to Dark mode in its label and accessible name. | simple | A bounded text change in one established component. |
| D10 | status-change | The status endpoint already returns a JSON object containing ready. Replace its constant true with the supplied boolean flag. Keep the existing property name, response status, headers, authorization, logging and error handling. Update the existing assertion for false. Do not introduce a new endpoint or dependency. | simple | Length and preservation details do not expand the localized implementation. |
| D11 | csv-export | Add a CSV export action to the existing filtered table using the established export API, including loading, empty-result and failed-download states. | moderate | Related UI and API behavior with bounded edge cases. |
| D12 | theme-preference | Persist the existing theme selection across reloads, honor the system preference until the user chooses, and keep the settings screen synchronized. | moderate | A bounded feature coordinating preference precedence and state. |
| D13 | status-change | Aggregate three existing health checks into the status response using the supplied readiness truth table and timeout policy. | moderate | Several related inputs under explicit contracts. |
| D14 | cursor-pagination | Add cursor pagination to an existing list endpoint and its client using the documented opaque-cursor contract, including empty pages and invalid cursors. | moderate | Client and server changes within an established pagination design. |
| D15 | email-validation | Reuse the existing email validator in the account form and API, preserving their different error formats and adding the specified malformed-address cases. | moderate | Coordinating validation across two known boundaries. |
| D16 | invoice-delivery | Guarantee one invoice when queue delivery repeats and workers crash between database commit and acknowledgement. Design the recovery path. | complex | Short wording hides distributed delivery and recovery invariants. |
| D17 | live-schema | Migrate a hot table to a new key while old and new application versions write concurrently; retain rollback after partial backfill. | complex | Concurrent versions, migration and rollback require a coordinated design. |
| D18 | reservation-race | Diagnose and fix a reservation race across three services where timeouts cause compensations to run after a successful retry. | complex | Interacting state machines and delayed recovery actions. |
| D19 | offline-sync | Design offline edit synchronization for the existing mobile and web clients, including conflict resolution, deleted records and interrupted reconnects. | complex | Cross-client convergence and failure behavior need a system design. |
| D20 | regional-failover | Add regional failover to the job scheduler while preserving leases, preventing duplicate work and recovering jobs after a network partition heals. | complex | Distributed ownership and recovery invariants across regions. |
| D21 | invoice-delivery | Determine whether exactly-once external invoicing is possible when the remote API offers neither idempotency keys nor observable transaction status; prove the limit and identify the weakest extra assumption that changes it. | apex | Feasibility and impossibility reasoning beyond implementing a known protocol. |
| D22 | replicated-index | Develop a new replicated indexing algorithm with bounded metadata under arbitrary offline intervals, and prove convergence or show those requirements are incompatible. | apex | Novel algorithm design with a difficult proof obligation. |
| D23 | research-feasibility | Can a protocol satisfy these new fairness and privacy constraints against an adaptive adversary? Establish feasibility and give a proof or counterexample. | apex | An open-ended formal feasibility question despite its brevity. |
| D24 | learned-scheduler | Investigate whether a learned scheduler can guarantee a tail-latency bound under nonstationary adversarial workloads; formulate assumptions and derive a guarantee or impossibility result. | apex | Research requires developing and proving a formal claim. |
| D25 | concurrent-semantics | Define semantics for a new concurrent language with reversible effects, then prove soundness or construct counterexamples that force a redesign. | apex | New semantics and proof-driven design, not a bounded language feature. |

## Machine-readable contract

`review-packet.json` contains the same tasks, proposed tiers and reasons, with every review pending. Accepted or corrected reviews require the final tier, reviewer, rationale, actual UTC timestamp, a reference to the explicit human decision, and a checksum of the case and rubric at review time. Corrections retain the original proposal. Changed task text, grouping, proposal or rubric invalidates the old case checksum.

The validator checks supplied attestations; it cannot authenticate a human or prove that a decision reference is genuine. A trusted operator must supply or confirm them. Do not fabricate reviewer names, timestamps, authority references or acceptance.

```bash
bun /absolute/path/gauge/evaluation/review.ts check /absolute/path/gauge/evaluation/review-packet.json
bun /absolute/path/gauge/evaluation/review.ts freeze /absolute/path/reviewed-packet.json /absolute/path/new-development-cohort.json /absolute/path/gauge/evaluation/PROTOCOL.md
```

`check` exits 2 for pending or disputed labels, 1 for invalid input, and 0 for structurally complete review. `freeze` refuses unresolved labels, rubric drift, relative paths and existing output files. It exports a private, development-only snapshot with source/rubric digests and full review provenance. This is no-overwrite behavior, not tamper-proof storage; the owner can still modify a file afterward. No freeze or scoring happens automatically.

After review: freeze development labels, improve the candidate using only development material, and freeze its implementation before a different evaluator prepares or reveals a genuinely independent human-reviewed holdout. Use production classifier exports for evaluation. Retain original results. Promotion remains a separate decision after quality and routing-preservation checks.
