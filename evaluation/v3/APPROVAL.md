# Gauge N01–N40 human review completed

Reviewer: marlandoj (workspace operator). September 23, 2026. The exact recording timestamp is in [label-approval.json](label-approval.json); the transport supplied no separate message timestamp.

Authority: the current user message linked this review packet and stated “human review completed.” The operator's GitHub edit at commit `126f7c5` records 39 accepted labels and one correction: **N09, trivial → simple**, with the exact reason `[reason:requires simple data parsing ]`. All 40 decisions are resolved. Final tier counts: trivial 7, simple 9, moderate 8, complex 8, apex 8.

The machine-readable approval binds each decision to its original case and binds the original cohort, manifest, rubric, freeze, results and opening receipt by checksum. Its LABEL-REVIEW.md source checksum refers to the operator-edited file at that commit, before the stale summary was updated. Review is operator-attested, occurred after results were disclosed, and is not a new blinded evaluation or permission for live routing.

## Effect on saved predictions

N09's saved v3 prediction is trivial. Applying the operator's simple label makes that prediction incorrect. The original rubric and proposed label are preserved; the operator correction is recorded separately.

| Exact tier accuracy | Original labels | Human-reviewed labels |
| --- | ---: | ---: |
| V3 | 24/40 (60%) | 23/40 (57.5%) |
| Archived v2 | 19/40 (47.5%) | 19/40 (47.5%) |
| Local baseline | 12/40 (30%) | 13/40 (32.5%) |
| Swarm baseline | 18/40 (45%) | 19/40 (47.5%) |

[results-human-reviewed.json](results-human-reviewed.json) reaggregates the saved predictions with the unchanged metric functions. Original metrics were reproduced exactly before applying the reviewed labels. No classifier execution, diagnostic reopening, retuning or original artifact replacement occurred. All 17 frozen source/input digests still match.

The quality gate remains **failed**: five complex/apex under-routes, one high-tier abstention and six errors of at least two tiers. Routing remains shadow-only. The original 24/40 result remains the historical preregistered diagnostic; 23/40 is the separate post-review accounting.

Human review is complete. Further improvement requires a new candidate freeze and different fresh validation. N01–N40 is exposed reviewed material and cannot be presented as a fresh holdout for a future candidate.
