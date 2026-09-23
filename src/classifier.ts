export const TIERS = ['trivial', 'simple', 'moderate', 'complex', 'apex'] as const;
export type Tier = typeof TIERS[number];
export const HARNESSES = ['claude-code', 'codex', 'gemini', 'kimi', 'opencode', 'pi', 'hermes'] as const;
export type Harness = typeof HARNESSES[number];
export const VERSION = 'gauge-0.1.0';
export type Assessment = { tier: Tier | null; reasons: string[]; abstained: boolean };
export function swarmTier(tier: Tier): Exclude<Tier, 'apex'> { return tier === 'apex' ? 'complex' : tier; }

export function classify(value: unknown): Assessment {
  if (typeof value !== 'string' || !value.trim() || value.length > 100_000)
    return { tier: null, reasons: ['insufficient_context'], abstained: true };
  const text = value.replace(/```[\s\S]*?```/g, ' ').trim().toLowerCase();
  if (!text || /^(continue|proceed|yes|ok|do it|fix (it|that)|same as before)[.!\s]*$/.test(text))
    return { tier: null, reasons: ['insufficient_context'], abstained: true };
  const has = (re: RegExp) => re.test(text);
  const result = (tier: Tier, reasons: string[]): Assessment => ({ tier, reasons, abstained: false });
  const lookup = has(/^(what\b|define|explain|show|list|find|locate|print|count|tell me|give (me|the)|state|convert|translate|summari[sz]e)\b/);
  const bounded = has(/\b(typo|spelling|rename|label|button text|heading|comment|readme|one line|single line|formatting)\b/);
  const reasoning = has(/\b(design|redesign|architect|implement|build|create|develop|research|invent|formulate|migrate|merge|consolidate|diagnose|debug|investigate|prove|proving|derive|deriving|reconcile|optimi[sz]e|repair|fix|resolve|refactor)\b/);
  const novelty = has(/\b(novel|first.principles|unprecedented|new algorithm|impossibility|formal proof|cross.domain synthesis)\b/);
  const systemic = has(/\b(distributed|multi.region|consensus|linearizability|byzantine|zero.downtime|without downtime|deadlock|race condition|concurrent|concurrency|racing|data loss|split.brain|cross.service|cross.tenant|tenant isolation|schema migration|schema evolution|schema changes|replication|idempotency|failover|backpressure|cutover|mixed.version)\b/);
  const breadth = has(/\b(across|end.to.end|whole|entire|multiple|several|all services|platform|fleet)\b/);
  const domains = [ /\b(security|cryptograph|privacy|compliance|isolation)\b/, /\b(distributed|consensus|replication|regions)\b/, /\b(machine learning|inference|training|optimization)\b/, /\b(architecture|protocol|algorithm|proof)\b/ ].filter(re => has(re)).length;
  if (has(/^(evaluate|calculate|compute)\b/) && has(/\b(true|false|boolean|arithmetic)\b/) && !reasoning)
    return result('trivial', ['bounded_lookup']);
  if (has(/^(return|extract|sort)\b/) && has(/\b(filename|basename|alphabetical|alphabetically)\b/))
    return result('trivial', ['bounded_lookup']);
  if (lookup && !reasoning && !has(/\b(compare|trade.offs|root cause|evaluate|recommend)\b/))
    return result(has(/\b(report|logs|article|document|differences)\b/) ? 'simple' : 'trivial', ['bounded_lookup']);
  if (bounded && !systemic && !breadth && !novelty) return result('simple', ['bounded_edit']);
  const proof = has(/\b(prove|proving|proofs?|semantics|machine.checks|machine.verified|bounds|guarantees|optimality)\b/);
  const research = has(/\b(research|invent|new|novel|synthesis|first.principles)\b/);
  if (reasoning && proof && (research || systemic)) return result('apex', ['research_proof_obligations']);
  if (novelty && reasoning && (systemic || domains >= 2)) return result('apex', ['novel_reasoning', 'cross_domain']);
  if (systemic && reasoning) return result('complex', ['systemic_reasoning']);
  if (breadth && reasoning && has(/\b(migration|migrate|architecture|architect|security|authentication|rollback|compatibility|transaction|protocol)\b/))
    return result('complex', ['cross_boundary_change']);
  if (reasoning && has(/\b(rollback|fairness|fair|fair service|isolated)\b/) && has(/\b(versions|fleet|providers|sessions|tenants|services|rollout)\b/))
    return result('complex', ['cross_boundary_change']);
  if (!systemic && !breadth && has(/\b(pure function|standard .* formula|supplied|provided|single.file|existing .* field)\b/)
    && !has(/\b(parser|formats|ingestion|validation|recovery)\b/)) return result('simple', ['bounded_edit']);
  if (has(/\b(endpoint|api|client|form|parser|cache|ingestion|pagination|paging|ttl)\b/)
    && has(/\b(add|extend|create|normalize|wrap|build|implement)\b/)) return result('moderate', ['bounded_engineering']);
  if (has(/\b(compare|evaluate|analy[sz]e|review|investigate|debug|diagnose|plan|test|implement|build|refactor|integrate|validate|audit)\b/))
    return result('moderate', ['bounded_engineering']);
  if (has(/\b(add|change|update|remove|replace|fix|write|create|run|sort|extract|install|upgrade|make|normalize|teach|set|give)\b/))
    return result('simple', ['bounded_operation']);
  return { tier: null, reasons: ['unrecognized_context'], abstained: true };
}
