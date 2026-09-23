import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { classify, VERSION, TIERS, type Tier } from '../../src/classifier.js';
import { classify as previous } from './classifier-v1.js';
import { assess, loadResolver } from '../../src/assess.js';
import { summarize, acceptance, latency, type Prediction } from '../metrics.js';
import { prepareFreeze } from '../review.js';

const root = resolve(import.meta.dir, '../..');
export const frozenFiles = ['src/classifier.ts', 'src/assess.ts', 'src/receipts.ts', 'scripts/gauge.ts',
  'integrations/task-assessment-observer.ts', 'evaluation/v2/run.ts', 'evaluation/v2/classifier-v1.ts',
  'evaluation/metrics.ts', 'evaluation/review.ts', 'evaluation/PROTOCOL.md', 'evaluation/v2/PROTOCOL.md',
  'evaluation/development.jsonl', 'evaluation/development-reviewed.json', 'evaluation/review-packet.json'];
const hash = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
export function sourceDigests() {
  return Object.fromEntries(frozenFiles.map(path => [path, hash(readFileSync(resolve(root, path)))]));
}
export function assertFrozen(expected: Record<string, string>, actual = sourceDigests()) {
  if (JSON.stringify(Object.keys(expected).sort()) !== JSON.stringify(frozenFiles.slice().sort())
    || frozenFiles.some(path => expected[path] !== actual[path])) throw Error('Frozen source mismatch');
}
type Row = { id: string; group_id: string; task_text: string; tier: Tier; rationale?: string };
export function validateRows(value: unknown): Row[] {
  if (!Array.isArray(value) || !value.length) throw Error('Empty or invalid cohort');
  const ids = new Set(), texts = new Set();
  for (const row of value) {
    if (!row || typeof row !== 'object' || !['id', 'group_id', 'task_text'].every(k => typeof row[k] === 'string' && row[k].trim())
      || !TIERS.includes(row.tier) || row.task_text.length > 100_000) throw Error('Invalid cohort row');
    const text = row.task_text.trim().replace(/\s+/g, ' ').toLowerCase();
    if (ids.has(row.id) || texts.has(text)) throw Error('Duplicate ID or task');
    ids.add(row.id); texts.add(text);
  }
  return value;
}
function reviewedDevelopment(): Row[] {
  const source = readFileSync(resolve(root, 'evaluation/review-packet.json'), 'utf8');
  const snapshot = JSON.parse(readFileSync(resolve(root, 'evaluation/development-reviewed.json'), 'utf8'));
  const checked = prepareFreeze(JSON.parse(source), source, readFileSync(resolve(root, 'evaluation/PROTOCOL.md'), 'utf8'));
  if (snapshot.source_sha256 !== checked.source_sha256 || JSON.stringify(snapshot.cases) !== JSON.stringify(checked.cases)) throw Error('Reviewed development snapshot mismatch');
  return validateRows(snapshot.cases);
}
async function main() {
  const [command, output, dataset] = process.argv.slice(2);
  if (command === '--help' || !command) {
    console.log('Usage: run.ts freeze /absolute/new-freeze.json | development /absolute/new-results.json | diagnostic /absolute/new-results.json /absolute/cohort.json\nGAUGE_TEST_LOCAL_BASELINE and GAUGE_TEST_SWARM_ROOT are required for scoring. Diagnostic requires candidate-freeze.json and cohort-manifest.json beside this script. Outputs never overwrite. Diagnostic scoring reserves a one-use opening receipt. No production promotion.');
    return;
  }
  if (!output || !isAbsolute(output) || !['freeze', 'development', 'diagnostic'].includes(command)) throw Error('Invalid arguments; use --help');
  if (command === 'freeze') {
    writeFileSync(output, JSON.stringify({ version: VERSION, frozen_at: new Date().toISOString(), files: sourceDigests() }, null, 2) + '\n', { flag: 'wx' });
    return;
  }
  const localPath = process.env.GAUGE_TEST_LOCAL_BASELINE;
  const swarmRoot = process.env.GAUGE_TEST_SWARM_ROOT;
  if (!localPath || !swarmRoot || !isAbsolute(localPath) || !isAbsolute(swarmRoot)) throw Error('Absolute baseline paths required');
  const swarmPath = resolve(swarmRoot, 'src/selector/executor-selector.ts');
  const baselineFiles = [localPath, resolve(localPath, '../../data/weights.json'), swarmPath];
  const baselineHashes = Object.fromEntries(baselineFiles.map(p => [p, hash(readFileSync(p))]));
  const [local, swarm, resolver] = await Promise.all([import(pathToFileURL(localPath).href), import(pathToFileURL(swarmPath).href), loadResolver(swarmRoot)]);
  const sourceHashes = sourceDigests();
  const approved = reviewedDevelopment();
  const original = validateRows(readFileSync(resolve(root, 'evaluation/development.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line)));
  let rows: Row[], datasetHash: string;
  if (command === 'diagnostic') {
    const frozen = JSON.parse(readFileSync(resolve(import.meta.dir, 'candidate-freeze.json'), 'utf8'));
    assertFrozen(frozen.files);
    const manifest = JSON.parse(readFileSync(resolve(import.meta.dir, 'cohort-manifest.json'), 'utf8'));
    if (!dataset || !isAbsolute(dataset) || !manifest.author || !Number.isFinite(Date.parse(manifest.created_at))
      || Date.parse(manifest.created_at) < Date.parse(frozen.frozen_at) || manifest.human_reviewed !== false) throw Error('Invalid diagnostic provenance');
    writeFileSync(resolve(import.meta.dir, 'diagnostic-opened.json'), JSON.stringify({ opened_at: new Date().toISOString(), files: sourceHashes, dataset_sha256: manifest.sha256 }) + '\n', { flag: 'wx' });
    const raw = readFileSync(dataset);
    datasetHash = hash(raw);
    if (datasetHash !== manifest.sha256) throw Error('Diagnostic dataset digest mismatch');
    rows = validateRows(JSON.parse(raw.toString()));
    if (rows.length !== manifest.cases || new Set(rows.map(r => r.group_id)).size !== manifest.groups) throw Error('Diagnostic count mismatch');
    const texts = new Set([...approved, ...original].map(r => r.task_text.trim().replace(/\s+/g, ' ').toLowerCase()));
    const groups = new Set([...approved, ...original].map(r => r.group_id));
    if (rows.some(r => texts.has(r.task_text.trim().replace(/\s+/g, ' ').toLowerCase()) || groups.has(r.group_id))) throw Error('Development overlap');
  } else {
    rows = [...approved, ...original];
    datasetHash = hash(JSON.stringify(rows));
  }
  const predictions: Record<string, Prediction[]> = Object.fromEntries(['candidate', 'previous', 'local', 'swarm', 'fallback_local', 'fallback_swarm'].map(k => [k, []]));
  const details = [];
  const times: number[] = [];
  classify('Return the current directory name.');
  for (const row of rows) {
    const start = performance.now(), candidate = classify(row.task_text);
    const elapsed = performance.now() - start;
    times.push(elapsed);
    const old = previous(row.task_text);
    const localTier = (await local.estimateComplexity(row.task_text)).tier;
    const swarmTier = swarm.inferComplexity({ id: row.id, task: row.task_text, persona: 'auto', priority: 'medium' });
    if (!TIERS.includes(localTier) || !TIERS.includes(swarmTier)) throw Error('Invalid baseline tier');
    const report = await assess({ task_text: row.task_text, harness: 'codex', current_tier: swarmTier }, 'gauge-synthetic-eval-v2', resolver);
    if (report.proposed_tier !== candidate.tier) throw Error('Production parity failure');
    const values = { candidate: candidate.tier, previous: old.tier, local: localTier, swarm: swarmTier,
      fallback_local: candidate.abstained ? localTier : candidate.tier, fallback_swarm: candidate.abstained ? swarmTier : candidate.tier };
    for (const [name, predicted] of Object.entries(values)) predictions[name]!.push({ id: row.id, group_id: row.group_id, expected: row.tier, predicted, abstained: predicted === null });
    details.push({ id: row.id, group_id: row.group_id, expected: row.tier, candidate, previous: old, local: localTier, swarm: swarmTier,
      elapsed_ms: elapsed, assessment_abstained: report.abstained });
  }
  assertFrozen(sourceHashes);
  if (baselineFiles.some(p => baselineHashes[p] !== hash(readFileSync(p)))) throw Error('Baseline changed while scoring');
  const metrics = Object.fromEntries(Object.entries(predictions).map(([k, v]) => [k, summarize(v)]));
  const comparisons = Object.fromEntries(['local', 'swarm'].flatMap(k => [[k, acceptance(metrics.candidate!, metrics[k]!)], [`fallback_${k}`, acceptance(metrics[`fallback_${k}`]!, metrics[k]!)]]));
  const result = { version: VERSION, generated_at: new Date().toISOString(), kind: command, dataset_sha256: datasetHash,
    source_sha256: sourceHashes, baseline_sha256: baselineHashes, metrics, comparisons,
    four_tier_boundary_normalized: Object.fromEntries(Object.entries(predictions).map(([k, v]) => [k, summarize(v, true)])),
    quality_goal_passed: Object.values(comparisons).every(v => v.passed), production_promotion_authorized: false,
    independent_human_reviewed_holdout: false, warm_classifier_latency: latency(times),
    latency_scope: 'One warmup; inner function only. Excludes process startup, resolver and receipt writes.',
    development_cohorts: command === 'development' ? Object.fromEntries(Object.entries(predictions).map(([k, v]) => [k, { approved: summarize(v.slice(0, approved.length)), original: summarize(v.slice(approved.length)) }])) : null,
    predictions: details };
  writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ output, kind: command, cases: rows.length, accuracies: Object.fromEntries(Object.entries(metrics).map(([k, v]) => [k, v.accuracy])), quality_goal_passed: result.quality_goal_passed }));
}
if (import.meta.main) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
