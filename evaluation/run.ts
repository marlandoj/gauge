import { createHash } from 'node:crypto';
import { readFile, writeFile, access } from 'node:fs/promises';
import { hostname, platform, arch } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { classify, VERSION } from '../src/classifier.js';
import { assess, loadResolver } from '../src/assess.js';
import { TIERS, summarize, acceptance, latency, type Tier, type Prediction } from './metrics.js';

const directory = dirname(fileURLToPath(import.meta.url));
const gaugeRoot = resolve(directory, '..');
const digest = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const exists = async (path: string) => access(path).then(() => true, () => false);
const tier = (value: unknown): Tier => {
  if (typeof value !== 'string' || !TIERS.includes(value as Tier)) throw Error('Baseline emitted an invalid tier');
  return value as Tier;
};
interface Case { id: string; group_id: string; task_text: string; tier: Tier }

async function main() {
  const split = process.argv[2];
  if (split !== 'development' && split !== 'heldout') throw Error('Usage: bun evaluation/run.ts development|heldout');
  const manifest = JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8'));
  if (digest(await readFile(resolve(directory, 'PROTOCOL.md'))) !== manifest.files['PROTOCOL.md'].sha256) throw Error('Frozen protocol hash mismatch');
  const candidateDigest = digest(await readFile(resolve(gaugeRoot, 'src/classifier.ts')));
  const output = resolve(directory, `results-${split}.json`);
  if (split === 'heldout') {
    if (await exists(output)) throw Error('Heldout results already exist; refusing a second evaluation');
    const frozen = JSON.parse(await readFile(resolve(directory, 'candidate-freeze.json'), 'utf8'));
    if (frozen.classifier_sha256 !== candidateDigest || !Number.isFinite(Date.parse(frozen.frozen_at))) throw Error('Candidate freeze missing or does not match classifier');
  }
  const localPath = resolve(process.env.GAUGE_TEST_LOCAL_BASELINE ?? '/home/workspace/Skills/tier-resolver/scripts/persona-tier-resolve.ts');
  const swarmRoot = resolve(process.env.GAUGE_TEST_SWARM_ROOT ?? '/home/workspace/packages/swarm');
  const swarmPath = resolve(swarmRoot, 'src/selector/executor-selector.ts');
  const [local, swarm, resolver] = await Promise.all([
    import(pathToFileURL(localPath).href),
    import(pathToFileURL(swarmPath).href),
    loadResolver(swarmRoot),
  ]);
  if (typeof local.estimateComplexity !== 'function' || typeof swarm.inferComplexity !== 'function') throw Error('Baseline exports unavailable');
  if (split === 'heldout') await writeFile(resolve(directory, 'heldout-opened.json'), JSON.stringify({ opened_at: new Date().toISOString(), classifier_sha256: candidateDigest, version: VERSION }) + '\n', { flag: 'wx', mode: 0o600 });
  const data = await readFile(resolve(directory, `${split}.jsonl`));
  if (digest(data) !== manifest.files[`${split}.jsonl`].sha256) throw Error('Frozen dataset hash mismatch');
  const rows: Case[] = data.toString('utf8').trim().split('\n').map(line => JSON.parse(line));
  if (rows.length !== manifest.files[`${split}.jsonl`].tasks) throw Error('Dataset count mismatch');
  await local.estimateComplexity('Return the current directory name.');
  classify('Return the current directory name.');
  await assess({ task_text: 'Return the current directory name.', harness: 'codex', current_tier: 'trivial' }, 'gauge-synthetic-evaluation', resolver);
  const predictions: { candidate: Prediction[]; local: Prediction[]; swarm: Prediction[]; candidate_fallback_local: Prediction[]; candidate_fallback_swarm: Prediction[] } = { candidate: [], local: [], swarm: [], candidate_fallback_local: [], candidate_fallback_swarm: [] };
  const measurements: Record<string, number[]> = { classifier: [], local_baseline: [], swarm_baseline: [], assessment: [] };
  const detailed = [];
  for (const row of rows) {
    let start = performance.now();
    const localRaw = await local.estimateComplexity(row.task_text);
    const localMs = performance.now() - start;
    const localTier = tier(localRaw.tier);
    start = performance.now();
    const swarmTier = tier(swarm.inferComplexity({ id: row.id, task: row.task_text, persona: 'auto', priority: 'medium' }));
    const swarmMs = performance.now() - start;
    start = performance.now();
    const candidate = classify(row.task_text);
    const candidateMs = performance.now() - start;
    start = performance.now();
    const assessment = await assess({ task_text: row.task_text, harness: 'codex', current_tier: swarmTier }, 'gauge-synthetic-evaluation', resolver);
    const assessMs = performance.now() - start;
    if (assessment.proposed_tier !== candidate.tier) throw Error('Production assessment and candidate prediction differ');
    const base = { id: row.id, group_id: row.group_id, expected: row.tier };
    predictions.candidate.push({ ...base, predicted: candidate.tier, abstained: candidate.abstained });
    predictions.local.push({ ...base, predicted: localTier, abstained: false });
    predictions.swarm.push({ ...base, predicted: swarmTier, abstained: false });
    predictions.candidate_fallback_local.push({ ...base, predicted: candidate.abstained ? localTier : candidate.tier, abstained: false });
    predictions.candidate_fallback_swarm.push({ ...base, predicted: candidate.abstained ? swarmTier : candidate.tier, abstained: false });
    measurements.classifier!.push(candidateMs);
    measurements.local_baseline!.push(localMs);
    measurements.swarm_baseline!.push(swarmMs);
    measurements.assessment!.push(assessMs);
    detailed.push({ ...base, candidate: { ...candidate, measured_elapsed_ms: candidateMs }, local_baseline: { raw: localRaw, tier: localTier, measured_elapsed_ms: localMs }, swarm_baseline: { tier: swarmTier, measured_elapsed_ms: swarmMs }, production_assessment: { ...assessment, measured_elapsed_ms: assessMs } });
  }
  if (digest(await readFile(resolve(gaugeRoot, 'src/classifier.ts'))) !== candidateDigest) throw Error('Candidate changed during evaluation');
  const five = Object.fromEntries(Object.entries(predictions).map(([name, values]) => [name, summarize(values)]));
  const four = Object.fromEntries(Object.entries(predictions).map(([name, values]) => [name, summarize(values, true)]));
  const comparisons = {
    local: acceptance(five.candidate!, five.local!),
    swarm: acceptance(five.candidate!, five.swarm!),
    fallback_local: acceptance(five.candidate_fallback_local!, five.local!),
    fallback_swarm: acceptance(five.candidate_fallback_swarm!, five.swarm!),
  };
  const weightsPath = resolve(dirname(localPath), '../data/weights.json');
  const results = {
    schema_version: 1, split, generated_at: new Date().toISOString(), classifier_version: VERSION,
    provenance: { candidate_sha256: candidateDigest, dataset_sha256: digest(data), manifest_sha256: digest(await readFile(resolve(directory, 'manifest.json'))), local_baseline: { path: localPath, sha256: digest(await readFile(localPath)), weights_sha256: await exists(weightsPath) ? digest(await readFile(weightsPath)) : null }, swarm_baseline: { path: swarmPath, sha256: digest(await readFile(swarmPath)) } },
    metrics_five_tier: five, metrics_four_tier_boundary_normalized: four, acceptance: comparisons,
    candidate_quality_goal_passed: Object.values(comparisons).every(value => value.passed),
    production_promotion_authorized: false,
    latency: { warm: Object.fromEntries(Object.entries(measurements).map(([name, samples]) => [name, latency(samples)])), cold: { measured: false, reason: 'Separate process measurement required; parent integration records this.' }, environment: { hostname: hostname(), platform: platform(), arch: arch(), bun: Bun.version }, scope: 'One warmup per production path. Assessment includes HMAC and configured real resolver, excludes module loading and receipt disk writes. No CLI or cold-process latency claim.' },
    parity: { same_classifier_export: true, assessment_proposed_tier_matches: true, assessment_harness: 'codex', resolver_root: swarmRoot },
    limitation: 'Agent-authored synthetic labels; paired paraphrases are correlated. Shadow routes remain unchanged regardless of scores.',
    predictions: detailed,
  };
  await writeFile(output, JSON.stringify(results, null, 2) + '\n', { flag: split === 'heldout' ? 'wx' : 'w', mode: 0o600 });
  console.log(JSON.stringify({ output, split, cases: rows.length, candidate_accuracy: five.candidate!.accuracy, local_accuracy: five.local!.accuracy, swarm_accuracy: five.swarm!.accuracy, quality_goal_passed: results.candidate_quality_goal_passed }));
}

if (import.meta.main) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
