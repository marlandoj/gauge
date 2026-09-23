import { createHmac } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { classify, HARNESSES, swarmTier, TIERS, VERSION, type Tier } from './classifier.js';

export interface Input {
  task_text: string; harness: string; current_tier?: Tier; current_model?: string;
  task_model?: string; role_model?: string; entry?: Record<string, unknown>;
}
export interface Route { executorId: string; model: string; tier: string; source: string; catalogSource?: string }
export interface Resolver {
  entries: Record<string, unknown>[];
  resolve: (task: Record<string, unknown>, harness: string, tier: string, entry: Record<string, unknown>, role?: string) => Route | null;
}
export async function loadResolver(root: string): Promise<Resolver> {
  const module = await import(pathToFileURL(resolve(root, 'src/routing/model-router.ts')).href);
  const registry = await import(pathToFileURL(resolve(root, 'src/registry/loader.ts')).href);
  if (typeof module.resolveModelForExecutor !== 'function' || typeof registry.loadRegistry !== 'function') throw Error('incompatible_resolver');
  return { entries: registry.loadRegistry(process.env.SWARM_EXECUTOR_REGISTRY ?? resolve(root, 'src/executor/registry/executor-registry.json')).executors, resolve: module.resolveModelForExecutor };
}
export async function assess(input: Input, key: string, resolver?: Resolver) {
  const started = performance.now();
  const classification = classify(input?.task_text);
  const baseline = TIERS.includes(input?.current_tier as Tier) ? input.current_tier! : null;
  const reasons = [...classification.reasons];
  let proposedRoute: Route | null = null;
  let unavailable = false;
  if (!HARNESSES.includes(input?.harness as never)) { unavailable = true; reasons.push('unsupported_harness'); }
  else if (classification.tier) {
    try {
      if (!resolver) throw Error('resolver_unavailable');
      const entry = input.entry ?? resolver.entries.find(e => e.id === input.harness);
      if (!entry || entry.id !== input.harness) throw Error('entry_unavailable');
      const pinned = Boolean(input.task_model || input.role_model);
      if (pinned && !baseline) throw Error('pin_context_unavailable');
      const tier = swarmTier(pinned ? baseline! : classification.tier);
      const route = resolver.resolve(
        { id: 'gauge-shadow', persona: 'auto', task: input.task_text, priority: 'medium', ...(input.task_model ? {model:input.task_model} : {}) },
        input.harness, tier, structuredClone(entry), input.role_model,
      );
      if (!route || route.executorId !== input.harness || typeof route.model !== 'string' || !route.model) throw Error('no_route');
      if (!TIERS.includes(route.tier as Tier) || !['task', 'role', 'registry', 'default'].includes(route.source)
        || (route.catalogSource && !['pin', 'catalog', 'floor'].includes(route.catalogSource))) throw Error('invalid_route');
      proposedRoute = { executorId: route.executorId, model: route.model, tier: route.tier, source: route.source, ...(route.catalogSource ? {catalogSource: route.catalogSource} : {}) };
      if (pinned) reasons.push('explicit_selection_preserved');
    } catch { unavailable = true; reasons.push('resolver_unavailable'); }
  }
  return {
    schema_version: 1, classifier_version: VERSION,
    task_digest: createHmac('sha256', key).update(typeof input?.task_text === 'string' ? input.task_text : '').digest('hex'),
    harness: HARNESSES.includes(input?.harness as never) ? input.harness : 'unknown',
    baseline_tier: baseline, proposed_tier: classification.tier, proposed_route: proposedRoute,
    reasons, abstained: classification.abstained || unavailable, elapsed_ms: performance.now() - started,
  };
}
