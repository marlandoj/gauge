# V3 pre-freeze review

Executed within the approved ZOU-1684 seed and uninterrupted continuation. Main source began clean at 1111b88. Exact v2 classifier archived as classifier-v2.ts; all tracked starting files hashed in preservation-before.json. Original heldout was not used for development.

The TF-IDF alternative was evaluated by a separate bounded agent in development-only grouped folds; see lexical/REPORT.md. It improved high-tier recall but regressed on earlier lower-tier tasks. The rule candidate was retained. Both selection and rule tuning are developer-visible, so these scores are training evidence.

Initial development snapshot results-development.json: 115/115. A separate bounded code review then found quoted requirements being erased and analytical requests taking the lookup branch. Both were fixed and regression-tested. Final source development snapshot results-development-reviewed.json: 114/115 versus v2 100/115. The remaining H21 failure is a quoted document reference containing “review,” classified moderate instead of trivial. This remaining development error is disclosed; no claim of perfection.

The same review found evaluator parity checking only the tier despite unavailable resolver advice, and timing measurement throwing when zero receipts exist. Parity now rejects unexpected assessment abstention or a missing route; timing records zero receipts. Baselines are bound at freeze and checked at opening. The follow-up review passed all bounded probes. No model/vendor consensus or specialist-model approval is claimed. Persona-consult ran in shadow mode only.

Mechanical pre-freeze evidence: 77 tests pass, zero skips with release/working/shared-consumer fixtures; TypeScript passes. Includes all seven harnesses, canonical selections and actual worker receipts. A separate diagnostic author will receive only the two protocols after freeze. No cohort has been authored or opened yet at this checkpoint.
