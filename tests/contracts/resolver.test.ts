import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assess, loadResolver, type Input, type Resolver } from '../../src/assess.js';
import { HARNESSES } from '../../src/classifier.js';

const scratch = mkdtempSync(join(tmpdir(), 'zo-task-gauge-contract-'));
const key = 'synthetic-contract-key';
const input = (harness = 'codex'): Input => ({ task_text: 'Design a novel distributed consensus protocol with a formal proof.', harness, current_tier: 'simple', current_model: 'operator-current' });
const modelResolver = (): Resolver => ({
  entries: HARNESSES.map(id => ({ id, marker: { unchanged: true } })),
  resolve: (task, harness, tier, _entry, role) => ({ executorId: harness, model: String(task.model || role || 'synthetic-qualified-model'), tier, source: task.model ? 'task' : role ? 'role' : 'registry' }),
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe('Gauge resolver boundary', () => {
  for (const harness of HARNESSES) test(`${harness} delegates and preserves baseline input`, async () => {
    const task = input(harness);
    const before = structuredClone(task);
    const report = await assess(task, key, modelResolver());
    expect(report.abstained).toBe(false);
    expect(report.proposed_tier).toBe('apex');
    expect(report.proposed_route?.tier).toBe('complex');
    expect(report.proposed_route?.executorId).toBe(harness);
    expect(task).toEqual(before);
    expect(JSON.stringify(report)).not.toContain(task.task_text);
    expect(JSON.stringify(report)).not.toContain('operator-current');
  });
  test('task model wins role model and keeps baseline tier', async () => {
    const report = await assess({ ...input(), task_model: 'task-pin', role_model: 'role-pin' }, key, modelResolver());
    expect(report.proposed_route).toMatchObject({ model: 'task-pin', tier: 'simple', source: 'task' });
  });
  test('role model survives candidate escalation', async () => {
    const report = await assess({ ...input(), role_model: 'role-pin' }, key, modelResolver());
    expect(report.proposed_route).toMatchObject({ model: 'role-pin', tier: 'simple', source: 'role' });
  });
  test('alias selection delegates baseline tier even with a legacy resolver', async () => {
    const report = await assess({ ...input(), task_model: 'heavy' }, key, modelResolver());
    expect(report.proposed_route).toMatchObject({ model: 'heavy', tier: 'simple', source: 'task' });
  });
  test('pin without baseline context abstains', async () => {
    const report = await assess({ ...input(), current_tier: undefined, task_model: 'heavy' }, key, modelResolver());
    expect(report.abstained).toBe(true);
    expect(report.proposed_route).toBeNull();
  });
  test('resolver mutation cannot change caller-owned entry', async () => {
    const resolver = modelResolver();
    const original = structuredClone(resolver.entries);
    const originalResolve = resolver.resolve;
    resolver.resolve = (task, harness, tier, entry, role) => {
      (entry.marker as { unchanged: boolean }).unchanged = false;
      task.task = 'altered';
      return originalResolve(task, harness, tier, entry, role);
    };
    const task = input();
    const text = task.task_text;
    await assess(task, key, resolver);
    expect(task.task_text).toBe(text);
    expect(resolver.entries).toEqual(original);
  });
  for (const failure of ['missing', 'entry', 'throw', 'null', 'wrong-harness', 'empty-model'] as const) test(`${failure} dependency abstains`, async () => {
    const resolver = modelResolver();
    if (failure === 'entry') resolver.entries = [];
    if (failure === 'throw') resolver.resolve = () => { throw Error('synthetic-private-provider-message'); };
    if (failure === 'null') resolver.resolve = () => null;
    if (failure === 'wrong-harness') resolver.resolve = () => ({ executorId: 'gemini', model: 'synthetic', tier: 'complex', source: 'registry' });
    if (failure === 'empty-model') resolver.resolve = () => ({ executorId: 'codex', model: '', tier: 'complex', source: 'registry' });
    const report = await assess(input(), key, failure === 'missing' ? undefined : resolver);
    expect(report.abstained).toBe(true);
    expect(report.proposed_route).toBeNull();
    expect(JSON.stringify(report)).not.toContain('synthetic-private-provider-message');
  });
  test('insufficient context does not invoke resolver', async () => {
    let calls = 0;
    const resolver = modelResolver();
    resolver.resolve = () => { calls++; return null; };
    expect((await assess({ ...input(), task_text: 'continue' }, key, resolver)).abstained).toBe(true);
    expect(calls).toBe(0);
  });
  test('configured root loads canonical exports instead of model tables', async () => {
    const root = join(scratch, 'portable-package');
    mkdirSync(join(root, 'src/routing'), { recursive: true });
    mkdirSync(join(root, 'src/registry'), { recursive: true });
    writeFileSync(join(root, 'src/routing/model-router.ts'), `export function resolveModelForExecutor(task,harness,tier,entry){return {executorId:harness,model:entry.syntheticModel,tier,source:'registry'}}`);
    writeFileSync(join(root, 'src/registry/loader.ts'), `export function loadRegistry(){return {executors:[{id:'codex',syntheticModel:'portable-root-model'}]}}`);
    expect((await assess(input(), key, await loadResolver(root))).proposed_route?.model).toBe('portable-root-model');
  });
  test('missing package import rejects without substituting models', async () => {
    await expect(loadResolver(join(scratch, 'missing-package'))).rejects.toThrow();
  });
});

const root = process.env.GAUGE_TEST_SWARM_ROOT;
describe.skipIf(!root)('canonical ZOU-1685 release integration', () => {
  const catalogPath = join(scratch, 'catalog', 'current.json');
  const lastGoodPath = join(scratch, 'catalog', 'last-known-good.json');
  const originalCatalog = process.env.SWARM_MODEL_CATALOG_PATH;
  const originalRegistry = process.env.SWARM_EXECUTOR_REGISTRY;
  const routeInput = { ...input(), task_text: 'Implement a parser with regression tests.' };
  mkdirSync(join(scratch, 'catalog'), { recursive: true });
  const freshCatalog = (qualified = true, generated = new Date().toISOString()) => ({
    schema_version: '1.0.0', generated_at: generated, stale_after_hours: 24,
    routes: { codex: { winner: { mid: 'gpt-synthetic-unqualified-winner' }, qualification: { mid: { qualified, model: 'gpt-synthetic-qualified', evidence: 'synthetic fixture' } } } },
  });
  async function withCatalog(content: string | null, fn: (resolver: Resolver) => Promise<void>, lastGood?: string) {
    process.env.SWARM_MODEL_CATALOG_PATH = catalogPath;
    process.env.SWARM_EXECUTOR_REGISTRY = join(root!, 'src/executor/registry/executor-registry.json');
    if (content === null) rmSync(catalogPath, { force: true }); else writeFileSync(catalogPath, content);
    if (lastGood) writeFileSync(lastGoodPath, lastGood); else rmSync(lastGoodPath, { force: true });
    try { await fn(await loadResolver(root!)); }
    finally {
      if (originalCatalog === undefined) delete process.env.SWARM_MODEL_CATALOG_PATH; else process.env.SWARM_MODEL_CATALOG_PATH = originalCatalog;
      if (originalRegistry === undefined) delete process.env.SWARM_EXECUTOR_REGISTRY; else process.env.SWARM_EXECUTOR_REGISTRY = originalRegistry;
    }
  }
  test('loads real entries for all seven harnesses with resolver parity', async () => {
    await withCatalog(null, async resolver => {
      const registry = JSON.parse(readFileSync(join(root!, 'src/executor/registry/executor-registry.json'), 'utf8'));
      for (const harness of HARNESSES) {
        const entry = resolver.entries.find(item => item.id === harness)!;
        expect(entry).toBeDefined();
        expect(registry.executors.some((item: { id: string }) => item.id === harness)).toBe(true);
        const report = await assess({ ...routeInput, harness }, key, resolver);
        const expected = resolver.resolve({ id: 'gauge-shadow', persona: 'auto', task: routeInput.task_text, priority: 'medium' }, harness, 'moderate', structuredClone(entry));
        expect(report.proposed_route?.model).toBe(expected?.model);
      }
    });
  });
  test('fresh catalog selects qualified record rather than unqualified winner', async () => {
    await withCatalog(JSON.stringify(freshCatalog()), async resolver => {
      expect((await assess(routeInput, key, resolver)).proposed_route).toMatchObject({ model: 'gpt-synthetic-qualified', catalogSource: 'catalog' });
    });
  });
  for (const state of ['missing', 'malformed', 'stale', 'unqualified']) test(`${state} catalog retains canonical floor`, async () => {
    const content = state === 'missing' ? null : state === 'malformed' ? '{invalid' : JSON.stringify(freshCatalog(state !== 'unqualified', state === 'stale' ? '2000-01-01T00:00:00Z' : new Date().toISOString()));
    await withCatalog(content, async resolver => {
      const report = await assess(routeInput, key, resolver);
      expect(report.abstained).toBe(false);
      expect(report.proposed_route?.catalogSource).toBe('floor');
      expect(report.proposed_route?.model).not.toBe('gpt-synthetic-qualified');
      expect(report.proposed_route?.model).not.toBe('gpt-synthetic-unqualified-winner');
    });
  });
  test('stale current catalog uses fresh last-known-good', async () => {
    await withCatalog(JSON.stringify(freshCatalog(true, '2000-01-01T00:00:00Z')), async resolver => {
      expect((await assess(routeInput, key, resolver)).proposed_route).toMatchObject({ model: 'gpt-synthetic-qualified', catalogSource: 'catalog' });
    }, JSON.stringify(freshCatalog()));
  });
  test('structurally malformed catalog abstains', async () => {
    await withCatalog(JSON.stringify({ generated_at: new Date().toISOString(), stale_after_hours: 24 }), async resolver => {
      const report = await assess(routeInput, key, resolver);
      expect(report.abstained).toBe(true);
      expect(report.proposed_route).toBeNull();
    });
  });
  test('registry pins override a fresh catalog without claiming qualification', async () => {
    await withCatalog(JSON.stringify(freshCatalog()), async resolver => {
      const entry = structuredClone(resolver.entries.find(item => item.id === 'codex')!);
      entry.modelPins = { mid: 'gpt-synthetic-operator-pin' };
      const report = await assess({ ...routeInput, entry }, key, resolver);
      expect(report.proposed_route).toMatchObject({ model: 'gpt-synthetic-operator-pin', catalogSource: 'pin' });
    });
  });
  test('canonical task and role pins retain original precedence', async () => {
    await withCatalog(JSON.stringify(freshCatalog()), async resolver => {
      const task = await assess({ ...routeInput, task_model: 'gpt-synthetic-task', role_model: 'gpt-synthetic-role' }, key, resolver);
      const role = await assess({ ...routeInput, role_model: 'gpt-synthetic-role' }, key, resolver);
      expect(task.proposed_route).toMatchObject({ model: 'gpt-synthetic-task', source: 'task' });
      expect(role.proposed_route).toMatchObject({ model: 'gpt-synthetic-role', source: 'role' });
    });
  });
  test('tier aliases retain canonical baseline resolution', async () => {
    await withCatalog(null, async resolver => {
      const entry = resolver.entries.find(item => item.id === 'codex')!;
      for (const requested of ['light', 'mid', 'heavy', 'gpt-5.x']) {
        const expected = resolver.resolve({ model: requested }, 'codex', 'simple', structuredClone(entry));
        const report = await assess({ ...input(), task_model: requested }, key, resolver);
        expect(report.proposed_route?.model).toBe(expected?.model);
        expect(report.proposed_route?.source).toBe('task');
      }
    });
  });
  test('canonical reader handles null missing catalog', async () => {
    const catalog = await import(pathToFileURL(join(root!, 'src/routing/model-catalog.ts')).href);
    expect(catalog.readBestModelCatalogSync(join(scratch, 'absent', 'current.json'))).toBeNull();
  });
});

const workingRoot = process.env.GAUGE_TEST_WORKING_SWARM_ROOT;
describe.skipIf(!workingRoot)('configured working swarm parity, read only', () => {
  test('all seven harness proposals preserve canonical task and role selections', async () => {
    const resolver = await loadResolver(workingRoot!);
    for (const harness of HARNESSES) {
      const entry = resolver.entries.find(item => item.id === harness)!;
      expect(entry).toBeDefined();
      for (const source of ['task', 'role'] as const) {
        for (const selection of ['light', 'mid', 'heavy']) {
          const expected = resolver.resolve(source === 'task' ? { model: selection } : {}, harness, 'simple', structuredClone(entry), source === 'role' ? selection : undefined);
          const report = await assess({ ...input(harness), ...(source === 'task' ? { task_model: selection } : { role_model: selection }) }, key, resolver);
          expect(report.proposed_route?.model).toBe(expected?.model);
          expect(report.proposed_route?.source).toBe(expected?.source);
        }
      }
    }
  });
});
