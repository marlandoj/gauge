# Gauge v3 proposed-label review

Status: all 40 labels are pending human review. No human has approved these labels. They are judgments proposed by a separate OpenAI Codex author agent, not human-reviewed ground truth or an independent vendor panel.

The author received only the original evaluation contract and v3 preregistration as source material and did not inspect candidate code, development cohorts, prior predictions, or production prompts. All scenarios are synthetic. Unique texts and group IDs do not establish semantic independence. The human reviewer should assess the requested reasoning against the frozen rubric; no review decision is presumed here.

## N01

- Group: `gauge-v3-independent-01`
- Proposed tier: **trivial**
- Human review: **PENDING — no approval**

Task:

The incident note says: 'The pump stopped at 08:14 UTC and restarted at 08:23 UTC.' How many minutes was it stopped?

Rationale:

Subtracting two stated times is one elementary transformation with no design decisions.

## N02

- Group: `gauge-v3-independent-02`
- Proposed tier: **moderate**
- Human review: **PENDING — no approval**

Task:

Add a downloadable CSV to the existing staff-hours report. Reuse its current filtered query and permission check. Include the displayed columns in the same order, escape commas, quotes and line breaks correctly, and show the existing empty-state message when no rows match. Wire the download button into the report page.

Rationale:

The bounded export feature connects an established query, formatting behavior and UI, with specified data edge cases.

## N03

- Group: `gauge-v3-independent-03`
- Proposed tier: **complex**
- Human review: **PENDING — no approval**

Task:

Our building badges are checked by offline door controllers, a central authorization service and a mobile enrollment app. Design and implement revocation so a lost badge cannot regain access after a controller reconnects, even if old enrollment events arrive late. Controllers may be disconnected for a day. Include the storage transition, event ordering rules, staged rollout and recovery after a partially completed update.

Rationale:

Several interacting systems require a migration and explicit offline, ordering and recovery invariants with consequential access behavior.

## N04

- Group: `gauge-v3-independent-04`
- Proposed tier: **simple**
- Human review: **PENDING — no approval**

Task:

In the existing JavaScript helper, change the query-string builder so null and undefined values are omitted, zero and false are retained, and all retained keys and values are encoded with encodeURIComponent. Keep its current object-in, string-out interface.

Rationale:

This is an isolated familiar helper change with explicit outcomes for a few inputs and no broader architectural decisions.

## N05

- Group: `gauge-v3-independent-05`
- Proposed tier: **apex**
- Human review: **PENDING — no approval**

Task:

A statistics service must reveal the exact total of household incomes, let any participant verify that every submitted value was included, and reveal no information about any one household even when every other participant colludes. Determine whether these requirements can coexist. Give a formal adversary model, prove the achievable or impossible claims, and identify the weakest requirement relaxation that permits a construction.

Rationale:

The requested result is a formal feasibility boundary involving privacy, collusion and exact disclosure, including proof and construction under a justified relaxation.

## N06

- Group: `gauge-v3-independent-06`
- Proposed tier: **simple**
- Human review: **PENDING — no approval**

Task:

Please add a clear button to this search input. The component already receives value and onChange props; clicking the button should call onChange with an empty string and put focus back in the input. Hide the button when value is empty.

Rationale:

One familiar component needs a localized interaction whose state and focus behavior are fully specified.

## N07

- Group: `gauge-v3-independent-07`
- Proposed tier: **apex**
- Human review: **PENDING — no approval**

Task:

We have a published notation for reversible workflow steps, but compensation can itself create externally visible effects. Develop a semantics that distinguishes an undone operation from an operation whose effect was counteracted. Establish which histories are observationally equivalent, and investigate whether equivalence is decidable for workflows with unbounded recursion and asynchronous messages.

Rationale:

Inventing formal semantics and establishing equivalence and decidability limits is open research with substantial proof obligations.

## N08

- Group: `gauge-v3-independent-08`
- Proposed tier: **moderate**
- Human review: **PENDING — no approval**

Task:

A catalog editor already has a documented draft API and standard form components. Add editing for a product's title, description and up to five tags. Preserve unsaved values when validation fails, disable save during a request, show field errors returned by the API, and update the preview after a successful save.

Rationale:

A bounded editing feature coordinates form state, validation, request state and preview updates using established components and an existing contract.

## N09

- Group: `gauge-v3-independent-09`
- Proposed tier: **trivial**
- Human review: **PENDING — no approval**

Task:

Use only this schedule: Cedar opens Monday at 09:00, Birch opens Monday at 10:30, and Elm opens Monday at 08:45. What time does Birch open on Monday? Return the time only.

Rationale:

The requested time is directly present in the supplied schedule and requires only lookup.

## N10

- Group: `gauge-v3-independent-10`
- Proposed tier: **complex**
- Human review: **PENDING — no approval**

Task:

Move a ticketing site's seat reservations from a database lease table to a separate reservation service while sales continue. Payment callbacks, lease expiry and the old checkout workers can race. Plan the ownership handoff, implement the compatibility path, and verify that a seat is never sold twice and a paid reservation is recoverable after failures at every handoff point.

Rationale:

A live migration spans checkout, payment, storage and leases, with concurrency and failure recovery invariants that require design and verification.

## N11

- Group: `gauge-v3-independent-11`
- Proposed tier: **apex**
- Human review: **PENDING — no approval**

Task:

Investigate a streaming algorithm for finding all frequent connected subgraphs in an unbounded graph stream whose edges may later be retracted. Memory must remain sublinear in the number of distinct edges, and the output must have an explicitly stated error bound. Define the attainable guarantees, derive lower bounds where necessary, and evaluate a proposed algorithm against those limits.

Rationale:

The task asks for algorithm research, formal resource and accuracy guarantees, and feasibility or lower-bound analysis.

## N12

- Group: `gauge-v3-independent-12`
- Proposed tier: **simple**
- Human review: **PENDING — no approval**

Task:

Change the fallback label in formatCustomerName from 'Unknown user' to 'Unnamed customer'. The function's other behavior should stay as it is.

Rationale:

Changing one known function's literal fallback is a localized implementation edit with no unresolved design.

## N13

- Group: `gauge-v3-independent-13`
- Proposed tier: **trivial**
- Human review: **PENDING — no approval**

Task:

The sample DNA sequence is ACGTTA. Reverse the character order without complementing the bases.

Rationale:

Reversing a supplied six-character string is an elementary transformation.

## N14

- Group: `gauge-v3-independent-14`
- Proposed tier: **complex**
- Human review: **PENDING — no approval**

Task:

After a warehouse network partition, both the handheld scanners and packing stations may have accepted movements for the same tote. We need a new inventory ledger shared by those clients, the ERP connector and the shipping service. Work out conflict resolution and replay rules, migrate outstanding movements, and provide a recovery process that preserves shipment traceability when a connector crashes after sending but before recording an acknowledgment.

Rationale:

The ledger design and migration involve several systems, conflicting offline writes, replay and uncertain external effects requiring recovery invariants.

## N15

- Group: `gauge-v3-independent-15`
- Proposed tier: **moderate**
- Human review: **PENDING — no approval**

Task:

Implement the existing museum app's date-range filter across its results list and URL state. The router and data endpoint already support inclusive start/end dates. Reject an end date before the start, support either endpoint being blank, restore filters from a shared URL and reset the page number when dates change.

Rationale:

This bounded feature coordinates established router, form and list contracts while addressing several date and navigation edge cases.

## N16

- Group: `gauge-v3-independent-16`
- Proposed tier: **trivial**
- Human review: **PENDING — no approval**

Task:

Lowercase this identifier and replace its spaces with underscores: 'Quarterly Energy Report'.

Rationale:

The request specifies a direct text transformation without implementation choices.

## N17

- Group: `gauge-v3-independent-17`
- Proposed tier: **moderate**
- Human review: **PENDING — no approval**

Task:

An existing issue tracker supports file attachments through a documented upload API. Add the attachment picker to the issue form: accept at most three PDFs under 8 MB each, report a failed file separately, allow removing a selected file, and submit only successfully uploaded attachment IDs with the issue.

Rationale:

This is a bounded multi-step form feature with validation, per-file request state and integration into an established issue submission contract.

## N18

- Group: `gauge-v3-independent-18`
- Proposed tier: **simple**
- Human review: **PENDING — no approval**

Task:

The current image cache has a get(key) method and a delete(key) method. Add invalidateMany(keys) that deletes each distinct supplied key once and returns the number of keys it attempted. An empty array should return zero.

Rationale:

The requested method is an isolated wrapper over existing operations with explicitly defined duplicate and empty-input behavior.

## N19

- Group: `gauge-v3-independent-19`
- Proposed tier: **complex**
- Human review: **PENDING — no approval**

Task:

We need to replace a hospital's alert delivery pipeline while bedside devices keep producing events. The device gateway, triage queue and paging provider disagree about whether an alert was accepted after a timeout. Define durable ownership and deduplication, migrate in-flight alerts, and implement restart and rollback procedures with evidence that acknowledged alerts cannot disappear during the cutover.

Rationale:

Multiple interacting delivery systems and a live migration require reasoning about ambiguous acknowledgments, durable ownership and consequential recovery behavior.

## N20

- Group: `gauge-v3-independent-20`
- Proposed tier: **apex**
- Human review: **PENDING — no approval**

Task:

Can a deterministic scheduler for mutually distrustful tenants guarantee starvation freedom, bounded response time and noninterference when execution costs are unknown and tenants may adapt their arrivals to observed completion times? Develop the model, establish compatibility or impossibility results, and propose a scheduler for the strongest satisfiable set of guarantees.

Rationale:

The outcome requires a new formal model and proof of which scheduling and information-flow guarantees are jointly feasible.

## N21

- Group: `gauge-v3-independent-21`
- Proposed tier: **complex**
- Human review: **PENDING — no approval**

Task:

A search cluster indexes documents from an event bus, while permission changes arrive through a different service. Design a rollout of a new indexing schema with no query downtime and no window where a revoked document is visible. Address backfill, reordered permission events, simultaneous schema versions and recovery when a region fails during the switch.

Rationale:

The schema migration spans indexing, events, authorization and regional service behavior with ordering and recovery guarantees.

## N22

- Group: `gauge-v3-independent-22`
- Proposed tier: **trivial**
- Human review: **PENDING — no approval**

Task:

The recipe lists 250 grams of flour per loaf. For exactly four loaves, how many grams of flour are needed?

Rationale:

Multiplying a stated quantity by four is one elementary calculation.

## N23

- Group: `gauge-v3-independent-23`
- Proposed tier: **moderate**
- Human review: **PENDING — no approval**

Task:

Extend the established notification settings screen with a weekly digest option. The settings API already exposes enabled, weekday and timezone fields. Use the existing select controls, require a weekday only when enabled, populate the current values on load, handle save errors and show the saved schedule in the summary text.

Rationale:

The bounded settings feature joins related form, persistence and summary components under an existing API with conditional validation.

## N24

- Group: `gauge-v3-independent-24`
- Proposed tier: **apex**
- Human review: **PENDING — no approval**

Task:

For neural networks using piecewise-linear activations and finite-precision weights, study whether a compact certificate can prove a specified output label is unchanged under every edit of up to k input tokens. Define the edit semantics precisely, derive verification complexity, and either construct a sound certificate method or prove limits on certificates of the requested size.

Rationale:

The task seeks research into formal verification and certificate complexity, including a novel construction or impossibility evidence.

## N25

- Group: `gauge-v3-independent-25`
- Proposed tier: **simple**
- Human review: **PENDING — no approval**

Task:

Add a Python function clamp(value, lower, upper). Return lower below the interval, upper above it and value inside it. Raise ValueError if lower exceeds upper. Inputs are ordinary finite integers or floats.

Rationale:

An isolated familiar function has a complete behavioral specification and a single explicit invalid-argument case.

## N26

- Group: `gauge-v3-independent-26`
- Proposed tier: **apex**
- Human review: **PENDING — no approval**

Task:

We want scientific notebooks to be reproducible even when cells query changing external datasets. Propose a formal provenance model that can state exactly when two executions are equivalent despite different source versions and floating-point reduction orders. Determine whether that equivalence can be checked automatically for unrestricted user code, and give useful sound approximations if it cannot.

Rationale:

Developing a provenance semantics, equivalence criteria and computability limits is open-ended formal research.

## N27

- Group: `gauge-v3-independent-27`
- Proposed tier: **moderate**
- Human review: **PENDING — no approval**

Task:

Our support dashboard already has a paginated customer endpoint. Add a customer selector that fetches results as the user types, uses the standard 300 ms debounce utility, discards stale responses, supports keyboard selection and preserves the selected customer's label after the menu closes.

Rationale:

A bounded interaction coordinates fetching, stale-result handling and accessible selection using established endpoint and utility contracts.

## N28

- Group: `gauge-v3-independent-28`
- Proposed tier: **trivial**
- Human review: **PENDING — no approval**

Task:

In this JSON object, what is the value of retries? {"queue":"nightly","retries":6,"timeout_seconds":45}. Return the number only.

Rationale:

The answer is a direct lookup of a supplied object field.

## N29

- Group: `gauge-v3-independent-29`
- Proposed tier: **complex**
- Human review: **PENDING — no approval**

Task:

Replace the central secret used by our signing service with rotating per-tenant keys. Existing signed links must remain verifiable until their expiry. The issuer, verification gateways, key store and disaster-recovery region update independently. Design and implement the transition, including rollback, compromised-key revocation and behavior during replication lag without accepting a signature under the wrong tenant.

Rationale:

The transition crosses several independently updated systems and requires careful identity, compatibility, revocation and failure recovery invariants.

## N30

- Group: `gauge-v3-independent-30`
- Proposed tier: **simple**
- Human review: **PENDING — no approval**

Task:

The CLI already parses a --quiet boolean. In the existing completion handler, suppress its success message when quiet is true while still returning the same exit code. Error output is handled elsewhere.

Rationale:

A known handler needs one localized conditional change with its boundary explicitly specified.

## N31

- Group: `gauge-v3-independent-31`
- Proposed tier: **simple**
- Human review: **PENDING — no approval**

Task:

Add a last-used marker to the existing palette component. It already owns selectedColor state; persist that value under the documented localStorage key whenever it changes, restore it on mount, and ignore stored values that are not in the fixed allowed-color list.

Rationale:

This is a localized component enhancement using a familiar storage API and a fully specified validation rule.

## N32

- Group: `gauge-v3-independent-32`
- Proposed tier: **complex**
- Human review: **PENDING — no approval**

Task:

A regional rail operator wants timetable edits to propagate to platform displays, conductor devices and the public journey planner. Some clients work offline and may submit platform changes against an old timetable. Create a versioned update design, migrate the current feed and define reconciliation, rollback and recovery rules so a canceled service cannot reappear through a delayed client update.

Rationale:

Versioned migration and offline updates across multiple systems introduce ordering, reconciliation and recovery invariants.

## N33

- Group: `gauge-v3-independent-33`
- Proposed tier: **apex**
- Human review: **PENDING — no approval**

Task:

For a language with higher-order functions, exceptions and resumable effects, devise a resource type system that ensures a file handle is closed exactly once along every terminating path. Show how continuation duplication interacts with that property. Supply a soundness argument and characterize programs for which the analysis necessarily loses precision or cannot decide acceptance.

Rationale:

The request requires new type-system design, a soundness proof and analysis of expressive and decidability limits.

## N34

- Group: `gauge-v3-independent-34`
- Proposed tier: **trivial**
- Human review: **PENDING — no approval**

Task:

Here is the release checklist: build, sign, upload, announce. Which item immediately follows sign?

Rationale:

Identifying the next element of a supplied sequence is a direct lookup.

## N35

- Group: `gauge-v3-independent-35`
- Proposed tier: **moderate**
- Human review: **PENDING — no approval**

Task:

Add a side-by-side comparison view for two saved experiment runs. The existing run-detail endpoint returns the same metric schema for each run. Let users choose the two runs, align metrics by their stable IDs, mark missing values with an em dash, show signed numeric differences where both values exist and keep the choices in the URL.

Rationale:

The feature combines related selection, fetching, alignment, display and URL-state behavior with established schemas and bounded edge cases.

## N36

- Group: `gauge-v3-independent-36`
- Proposed tier: **simple**
- Human review: **PENDING — no approval**

Task:

Create a reusable accordion item in our existing component library. It takes title, children and an initiallyOpen boolean; clicking its native button toggles the content and updates aria-expanded. Use the library's current spacing and type tokens.

Rationale:

A single familiar UI component has explicit local state and accessibility behavior within an existing design system.

## N37

- Group: `gauge-v3-independent-37`
- Proposed tier: **trivial**
- Human review: **PENDING — no approval**

Task:

The archive records a temperature of -12 degrees Celsius on Tuesday and -5 on Wednesday. By how many degrees did the recorded temperature rise?

Rationale:

A difference between two given numbers is a single elementary arithmetic operation.

## N38

- Group: `gauge-v3-independent-38`
- Proposed tier: **moderate**
- Human review: **PENDING — no approval**

Task:

Extend an existing reading-list page with bulk archive. Selection must span the currently loaded pages, the provided batch endpoint returns success or failure per item, successful items should leave the list, failed ones should stay selected with their messages, and the toolbar should show the current selected count.

Rationale:

A bounded feature coordinates selection state, a documented batch contract and partial-result UI updates across related components.

## N39

- Group: `gauge-v3-independent-39`
- Proposed tier: **apex**
- Human review: **PENDING — no approval**

Task:

Investigate whether a peer-to-peer collaborative editor can permanently forget a deleted passage while still merging arbitrary edits from replicas that have been offline without a time limit. Specify what forgetting and correct merging mean, prove which combinations are possible, and design an algorithm meeting the strongest attainable guarantees with bounded metadata.

Rationale:

The task asks for research into compatibility limits between deletion, unbounded offline operation and bounded metadata, with formal definitions, proofs and an algorithm.

## N40

- Group: `gauge-v3-independent-40`
- Proposed tier: **complex**
- Human review: **PENDING — no approval**

Task:

Our fleet update system uses a campaign service, an artifact store and device agents that can lose power mid-install. Introduce staged firmware rollout with automatic halt when failures rise. Define durable campaign and device states, signed-artifact compatibility checks, idempotent progress reporting and recovery from partial installation, then verify rollback cannot strand devices on a boot-incompatible version.

Rationale:

The rollout spans several interacting systems and requires durable state, compatibility and recovery design under interrupted installation and concurrent reporting.
