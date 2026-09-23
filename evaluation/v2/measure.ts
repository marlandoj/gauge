import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir, hostname, arch, platform } from 'node:os';
import { join, resolve } from 'node:path';
import { observeTaskAssessment } from '../../integrations/task-assessment-observer.js';
import { latency } from '../metrics.js';
import { assertFrozen } from './run.js';

const root = resolve(import.meta.dir, '../..');
const freeze = JSON.parse(readFileSync(join(import.meta.dir, 'candidate-freeze.json'), 'utf8'));
assertFrozen(freeze.files);
const home = mkdtempSync(join(tmpdir(), 'zo-task-gauge-v2-latency-'));
const swarmRoot = process.env.GAUGE_SWARM_ROOT;
if (!swarmRoot) throw Error('GAUGE_SWARM_ROOT required');
const input = { task_text: 'Diagnose a distributed race condition', harness: 'codex', current_tier: 'trivial' };
const samples = { fresh_process_cli: [] as number[], observer_fresh_worker: [] as number[] };
process.env.GAUGE_HOME = home;
process.env.GAUGE_MODE = 'shadow';
for (let i = 0; i < 20; i++) {
  let start = performance.now();
  const child = spawnSync('bun', [join(root, 'scripts/gauge.ts'), 'assess'], { input: JSON.stringify(input), encoding: 'utf8', timeout: 2000 });
  if (child.status !== 0 || JSON.parse(child.stdout).abstained) throw Error('CLI failure');
  samples.fresh_process_cli.push(performance.now() - start);
  start = performance.now();
  if (observeTaskAssessment('baseline', input, { root, swarmRoot }) !== 'baseline') throw Error('Route changed');
  samples.observer_fresh_worker.push(performance.now() - start);
}
const rows = readFileSync(join(home, 'assessments.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
assertFrozen(freeze.files);
const output = { generated_at: new Date().toISOString(), samples: 20, bun: Bun.version, host: hostname(), platform: platform(), arch: arch(),
  scope: 'Codex synthetic task; new process per call with warm filesystem cache, no discarded warmups; includes startup/imports/resolver and observer disk writes. No provider calls. Missing receipts include timeouts or write failures and are not silently excluded.',
  observations_completed: rows.length, observations_missing: 20 - rows.length,
  measurements: Object.fromEntries(Object.entries(samples).map(([name, values]) => [name, latency(values)])) };
writeFileSync(join(import.meta.dir, 'latency.json'), JSON.stringify(output, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(output));
