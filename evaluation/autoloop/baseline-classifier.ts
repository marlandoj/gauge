export const TIERS = ['trivial', 'simple', 'moderate', 'complex', 'apex'] as const;
export type Tier = typeof TIERS[number];
export const HARNESSES = ['claude-code', 'codex', 'gemini', 'kimi', 'opencode', 'pi', 'hermes'] as const;
export type Harness = typeof HARNESSES[number];
export const VERSION = 'gauge-0.3.0';
export type Assessment = { tier: Tier | null; reasons: string[]; abstained: boolean };
export function swarmTier(tier: Tier): Exclude<Tier, 'apex'> { return tier === 'apex' ? 'complex' : tier; }

export function classify(value: unknown): Assessment {
  if (typeof value !== 'string' || !value.trim() || value.length > 100_000)
    return { tier: null, reasons: ['insufficient_context'], abstained: true };
  const text = value.replace(/```[\s\S]*?```/g, ' ').trim().toLowerCase();
  if (!text || /^(continue|proceed|yes|ok|do it|fix (it|that)|same as before)[.!\s]*$/.test(text))
    return { tier: null, reasons: ['insufficient_context'], abstained: true };
  const request = text.replace(/\b(?:do not|don't|never)\b[^.;!\n]*/g, ' ')
    .replace(/\bwithout\s+(?:changing|modifying|implementing|designing|diagnosing|adding)\b[^.;!\n]*/g, ' ')
    .replace(/^(?:please\s+|could you\s+|can you\s+)/, '');
  const has = (re: RegExp) => re.test(request);
  const result = (tier: Tier, reasons: string[]): Assessment => ({ tier, reasons, abstained: false });
  const lookup = has(/(?:^|[.!?]\s+)(what\b|define|explain|show|list|find|locate|print|count|tell me|give (me|the)|state|convert|translate|summari[sz]e|read|extract|report|return|inspect|express|copy)\b/)
    || has(/^in the supplied\b.*\breport\b/);
  const bounded = has(/\b(typo|spelling|rename|label|button text|heading|comment|readme|one line|single line|formatting)\b/);
  const reasoning = has(/\b(design|redesign|architect|implement|build|create|develop|write|invent|formulate|migrate|merge|consolidate|diagnose|debug|investigate|prove|proving|derive|deriving|reconcile|optimi[sz]e|repair|fix|resolve|refactor|guarantee|determine|establish|add|synchroni[sz]e|coordinate|introduce|devise|characteri[sz]e|explore|work out)\b/)
    || has(/(?:^|[.!?]\s+)research\b/);
  const novelty = has(/\b(novel|first.principles|unprecedented|new algorithm|impossibility|formal proof|cross.domain synthesis)\b/);
  const systemic = has(/\b(distributed|multi.region|consensus|linearizability|byzantine|zero.downtime|without downtime|deadlock|race|race condition|concurrent|concurrently|concurrency|racing|data loss|split.brain|cross.service|cross.tenant|tenant isolation|schema migration|schema evolution|schema changes|replication|idempotency|failover|backpressure|cutover|mixed.version)\b/);
  const breadth = has(/\b(across|end.to.end|whole|entire|multiple|several|all services|platform|fleet)\b/);
  const domains = [ /\b(security|cryptograph|privacy|compliance|isolation)\b/, /\b(distributed|consensus|replication|regions)\b/, /\b(machine learning|inference|training|optimization)\b/, /\b(architecture|protocol|algorithm|proof)\b/ ].filter(re => has(re)).length;
  const outsideQuotes = request.replace(/"[^"\n]*"|“[^”\n]*”|`[^`\n]*`/g, ' quoted_value ').replace(/\s+/g, ' ').trim();
  if (/\bconvert (?:the )?(?:exact )?text quoted_value to (?:uppercase|lowercase)\b/.test(outsideQuotes)
    && !/\b(implement|design|build|write|add|diagnose|prove|compare|analy[sz]e|recommend)\b/.test(outsideQuotes))
    return result('trivial', ['bounded_lookup']);
  const inquiry = has(/\b(derive|establish|characteri[sz]e|devise|formulate|research|invent|explore)\b/)
    || has(/\b(develop|design|create)\b[^.;!?]*\b(method|algorithm|framework|semantics|compressor|planner|protocol)\b/);
  const formal = has(/\b(mathematical(?:ly)?|theorem|lower bound|upper bound|bounds?|proof|correctness argument|indistinguishable|identifiability|unattainable|impossib\w*|cannot (?:hold|be|achieve)|weakest .* assumptions?|achievable|feasibility)\b/);
  if (inquiry && formal) return result('apex', ['research_proof_obligations']);
  const transition = has(/\b(migrat\w*|cutover|rollout|coexist|old and new|replac\w*|transition|consolidat\w*|authority transfers)\b/);
  const failure = has(/\b(offline|outages?|interrupt\w*|reconnect\w*|replay\w*|rollback|recover\w*|uncertain|conflicting|delayed|retreat|partial|reverse)\b/);
  const coordination = has(/\b(across|both|sites|systems|services|workers|controllers|sellers|scanners|directories|archives|providers|clients|channels)\b/);
  if (reasoning && transition && failure && coordination) return result('complex', ['cross_boundary_change']);
  const resultOnly = has(/\b(return|report|copy|express|convert|extract|what is)\b/)
    && !reasoning && !has(/\b(function|helper|component|handler|script|endpoint|api|file|code|make|compare|evaluate|recommend|analy[sz]e|review|root cause|trade.offs)\b/);
  if (resultOnly && (!has(/\b(change|replace|update|edit)\b/) || has(/\breturn (?:the new|only|.* exactly)\b/)))
    return result('trivial', ['bounded_lookup']);
  if (has(/^(evaluate|calculate|compute)\b/) && has(/\b(true|false|boolean|arithmetic)\b/) && !reasoning)
    return result('trivial', ['bounded_lookup']);
  if (has(/^(return|extract|sort)\b/) && has(/\b(filename|basename|alphabetical|alphabetically)\b/))
    return result('trivial', ['bounded_lookup']);
  const fieldLookup = lookup && has(/\b(value|field|property|position|count|literal)\b/)
    && !has(/\b(design|implement|build|create|develop|diagnose|debug|investigate|prove|derive|repair|fix|resolve|add|change|replace|update|compare|evaluate|recommend|analy[sz]e)\b/);
  if (fieldLookup) return result('trivial', ['bounded_lookup']);
  if (lookup && !reasoning && !has(/\b(compare|trade.offs|root cause|evaluate|recommend|change|replace|update)\b/))
    return result(has(/\b(report|logs|article|document|differences)\b/) ? 'simple' : 'trivial', ['bounded_lookup']);
  const boundedChange = has(/\b(rename|change|replace|update|set)\b/)
    && has(/\b(label|name|text|count|constant|flag|heading|padding|expectation)\b/)
    && !has(/\b(design|migrate|synchroni[sz]e|aggregate|recovery|across|concurrently|concurrent|failover|diagnose|investigate|prove|implement|build)\b/);
  const feature = has(/\b(api|endpoint|persist\w*|submit\w*|load(?:ing)?|save[ds]?|store|navigation)\b/)
    && has(/\b(errors?|fail(?:s|ure)?|pending|empty|missing|deleted|duplicates?|unsaved|reject\w*|validation)\b/);
  if (boundedChange && !feature || (bounded && !feature && !systemic && !breadth && !novelty)) return result('simple', ['bounded_edit']);
  const proof = has(/\b(prove|proving|proofs?|semantics|machine.checks|machine.verified|bounds?|guarantees?|optimality|counterexamples?|impossibility)\b/);
  const research = has(/\b(research|invent|new|novel|synthesis|first.principles)\b/);
  const feasibility = has(/\b(feasibility|impossibility|weakest .* assumption|incompatible|impossible|adversar(?:y|ial))\b/);
  if (proof && ((reasoning && (research || systemic || feasibility)) || (research && feasibility))) return result('apex', ['research_proof_obligations']);
  if (novelty && reasoning && (systemic || domains >= 2)) return result('apex', ['novel_reasoning', 'cross_domain']);
  if (systemic && reasoning) return result('complex', ['systemic_reasoning']);
  const recovery = has(/\b(crash(?:es)?|rollback|recovery|compensations?|interrupt(?:ed|ions?)|partition|reconnects?|retries|retry)\b/);
  const interacting = has(/\b(workers?|services|clients|regions|versions|queue|database|commit|acknowledgement|offline|leases|synchroni[sz]ation)\b/);
  const invariant = has(/\b(exactly.once|one invoice|once|duplicate|repeats|conflicts?|conflict resolution|preserv\w*|prevent\w*|retain\w*|guarantee\w*)\b/);
  if (reasoning && recovery && interacting && invariant) return result('complex', ['recovery_invariants']);
  if (breadth && reasoning && has(/\b(migration|migrate|architecture|architect|security|authentication|rollback|compatibility|transaction|protocol)\b/))
    return result('complex', ['cross_boundary_change']);
  if (reasoning && has(/\b(rollback|fairness|fair|fair service|isolated)\b/) && has(/\b(versions|fleet|providers|sessions|tenants|services|rollout)\b/))
    return result('complex', ['cross_boundary_change']);
  if (has(/\b(aggregate|synchroni[sz]ed|persist|reuse)\b/)
    && has(/\b(checks|preference|screen|form|api|reloads|error formats)\b/)) return result('moderate', ['bounded_engineering']);
  if (feature && reasoning) return result('moderate', ['bounded_engineering']);
  if (!systemic && !breadth && has(/\b((?:pure|one|single|isolated|reusable) (?:reusable )?function|standard .* formula|single.file|existing .* field|(?:write|implement|add|create) (?:a |one |small |reusable |javascript |python )*function)\b/)
    && !has(/\b(parser|formats|ingestion|validation|recovery)\b/)) return result('simple', ['bounded_edit']);
  if (has(/\b(endpoint|api|client|form|parser|cache|ingestion|pagination|paging|ttl)\b/)
    && has(/\b(add|extend|create|normalize|wrap|build|implement)\b/)) return result('moderate', ['bounded_engineering']);
  if (has(/\b(compare|evaluate|analy[sz]e|review|recommend|root cause|investigate|debug|diagnose|plan|test|implement|build|refactor|integrate|validate|audit)\b/))
    return result('moderate', ['bounded_engineering']);
  if (has(/\b(add|change|update|remove|replace|fix|write|create|run|sort|extract|install|upgrade|make|normalize|teach|set|give)\b/))
    return result('simple', ['bounded_operation']);
  return { tier: null, reasons: ['unrecognized_context'], abstained: true };
}
