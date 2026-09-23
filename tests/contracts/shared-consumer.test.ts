import { test, expect } from 'bun:test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { HARNESSES } from '../../src/classifier.js';

const swarmRoot = process.env.GAUGE_TEST_CONSUMER_ROOT;
(swarmRoot ? test : test.skip)('actual SwarmOrchestrator consumer preserves seven routes and emits private receipts across child boundary', async () => {
  const root = swarmRoot!;
  const old = { ...process.env };
  const home = mkdtempSync(join(tmpdir(),'zo-task-gauge-consumer-'));
  process.env.GAUGE_HOME = home;
  process.env.GAUGE_ROOT = resolve(import.meta.dir,'../..');
  process.env.GAUGE_SWARM_ROOT = root;
  process.env.GAUGE_MODE = 'shadow';
  const { SwarmOrchestrator } = await import(pathToFileURL(join(root,'src/orchestrator.ts')).href);
  const { loadRegistry } = await import(pathToFileURL(join(root,'src/registry/loader.ts')).href);
  const { resolveModelForExecutor } = await import(pathToFileURL(join(root,'src/routing/model-router.ts')).href);
  const entries = loadRegistry(join(root,'src/executor/registry/executor-registry.json')).executors;
  const caller = Object.create(SwarmOrchestrator.prototype);
  caller.registryEntries = entries;
  caller.roleRegistry = { resolve: () => null };
  try {
    for (const harness of HARNESSES) {
      const task = {id:'synthetic-'+harness, persona:'auto',task:'Diagnose a distributed race condition',priority:'medium'};
      const before = JSON.stringify(task);
      const expected = resolveModelForExecutor(task,harness,'trivial',entries.find((e:{id:string})=>e.id===harness))?.model;
      expect(caller.resolveModelFor(task,harness)).toBe(expected);
      expect(JSON.stringify(task)).toBe(before);
    }
    const rows = readFileSync(join(home,'assessments.jsonl'),'utf8').trim().split('\n').map(line=>JSON.parse(line));
    expect(rows).toHaveLength(7);
    expect(rows.map(row=>row.harness)).toEqual([...HARNESSES]);
    expect(rows.every(row=>row.proposed_tier==='complex' && !row.abstained)).toBe(true);
    expect(JSON.stringify(rows)).not.toContain('Diagnose');
  } finally {
    for (const key of ['GAUGE_HOME','GAUGE_ROOT','GAUGE_SWARM_ROOT','GAUGE_MODE']) {
      if (old[key] === undefined) delete process.env[key]; else process.env[key]=old[key];
    }
  }
});
