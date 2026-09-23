# Deterministic local classifier experiment

Recommendation: reject the tested TF-IDF classifiers as standalone replacements for v2. They improve H01–H30 but regress pooled exact accuracy and increase errors of at least two tiers. Keep results as development-only shadow evidence.

## Method

Only development.jsonl (60), development-reviewed.json cases (25), and approved v2/cohort.json H01–H30 (30) were read. Original heldout and any v3 cohort were never read. No repo mutations or specialist model calls occurred. All experiment code uses Python standard library; baseline calls the captured current v2 TypeScript export with Bun.

Twelve configurations: word unigrams; word unigrams plus adjacent word bigrams; those plus within-word character 3/4-grams, each with cosine nearest-neighbor k=1/3/5 (similarity-weighted vote) or cosine class centroid. Log term frequency and smoothed IDF are fit on training examples only. Each class centroid is the normalized sum of normalized training vectors. A small fixed function-word stoplist applies to unigrams/characters; bigrams preserve function words.

Leave-group-out excludes every example sharing group_id; 115 examples form 76 groups. A separate leave-cohort-out run excludes the entire evaluated cohort plus any matching groups from other cohorts. Vocabulary, IDF and centroid fitting occur inside each fold. All variants were reported; selecting the best after seeing these results creates development selection bias. This is not an independent promotion evaluation or nested model-selection estimate.

## Results

| Configuration / cohort | Task exact | Group exact | High-tier under | ≥2-tier errors | Escalations | Abstentions |
|---|---:|---:|---:|---:|---:|---:|
| v2 / all | 100/115 | 61/76 | 6/46 | 4/115 | 2/115 | 4/115 |
| v2 / development.jsonl | 60/60 | 30/30 | 0/24 | 0/60 | 0/60 | 0/60 |
| v2 / development-reviewed.json | 25/25 | 16/16 | 0/10 | 0/25 | 0/25 | 0/25 |
| v2 / v2/cohort.json | 15/30 | 15/30 | 6/12 | 4/30 | 2/30 | 4/30 |
| Group-out centroid / all | 94/115 | 59/76 | 0/46 | 6/115 | 16/115 | 0/115 |
| Group-out centroid / development.jsonl | 46/60 | 18/30 | 0/24 | 5/60 | 10/60 | 0/60 |
| Group-out centroid / development-reviewed.json | 19/25 | 12/16 | 0/10 | 1/25 | 5/25 | 0/25 |
| Group-out centroid / v2/cohort.json | 29/30 | 29/30 | 0/12 | 0/30 | 1/30 | 0/30 |
| Cohort-out centroid / all | 88/115 | 55/76 | 3/46 | 9/115 | 21/115 | 0/115 |
| Cohort-out centroid / development.jsonl | 41/60 | 16/30 | 3/24 | 7/60 | 13/60 | 0/60 |
| Cohort-out centroid / development-reviewed.json | 20/25 | 12/16 | 0/10 | 1/25 | 5/25 | 0/25 |
| Cohort-out centroid / v2/cohort.json | 27/30 | 27/30 | 0/12 | 1/30 | 3/30 | 0/30 |

Group-level error incidence, per-tier recall, and full confusion matrices with explicit abstention columns are in results.json for every configuration and cohort. Every predicted tier is in predictions.json, keyed by method and aligned with cases.json. baseline.json preserves baseline reason codes and abstention.

## Interpretation and limits

The best group-out centroid obtains 94/115 exact (81.7%) versus 100/115 (87.0%) from v2. Group exact falls from 61/76 to 59/76. Complex/apex under-routing improves from 6/46 to 0/46, but severe errors grow from 4/115 to 6/115 and escalation grows from 2/115 to 16/115. Baseline abstains on four cases, including one apex; alternative never abstains.

The best variant gets 29/30 on H, with H17 simple→moderate its only H error. When the entire H cohort is omitted from training, the same representation gets 27/30 (H16 trivial→complex, H17 simple→moderate, H26 trivial→simple). These results show useful generalization beyond H vocabulary, but do not overcome severe regression on older cohorts. Trivial/simple discrimination is weak: a unit-conversion implementation is sent to complex, log-parser work to trivial, and bounded string/theme changes to moderate. Topic resemblance is insufficient to infer requested reasoning difficulty.

Current v2 has already been tuned on the older development cohorts; its 100% there is an in-sample rule score. The learned alternative uses out-of-group predictions, so pooled comparisons have different development histories. Neither constitutes independent future quality evidence. Group IDs do not guarantee distinct concepts across cohorts; concept families and synthetic author styles may recur. The 76 groups are small and English-only, with different per-group sizes. No significance claims, routing changes or production promotion are justified.

No CLI/observer latency, malicious-input robustness, preservation/privacy/timeout gates, or production-like prevalence evaluation was performed. The experimental models use no abstention calibration. The bounded full experiment takes about 2.6 seconds in-process on this host; this is not a deployable inference-latency measurement.

## Reproduce

Run `python3 evaluation/v3/lexical/experiment.py --output-dir /absolute/scratch/directory` from the repository. Requires Python 3 standard library only. The portable script reads the committed development files and captured v2 baseline.json. It writes regenerated cases, results and predictions only to the specified scratch directory. Archived classifier: ../classifier-v2.ts. Baseline entries align with original development, approved D and approved H order. Original experiment was conducted before v3 freeze; this retained script changes only paths/output selection.
