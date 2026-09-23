export const TIERS = ['trivial', 'simple', 'moderate', 'complex', 'apex'] as const;
export type Tier = typeof TIERS[number];
export interface Prediction { id: string; group_id: string; expected: Tier; predicted: Tier | null; abstained: boolean }

export function summarize(rows: Prediction[], normalize = false) {
  const tiers: readonly Tier[] = normalize ? TIERS.slice(0, 4) : TIERS;
  const map = (tier: Tier): Tier => normalize && tier === 'apex' ? 'complex' : tier;
  const matrix: Record<string, Record<string, number>> = Object.fromEntries(tiers.map(t => [t, Object.fromEntries([...tiers, 'abstain'].map(p => [p, 0]))]));
  let correct = 0, under = 0, escalated = 0, severeUp = 0, severeDown = 0, abstained = 0, high = 0, highAbstained = 0;
  const groups = new Map<string, { correct: boolean; severe: boolean; under: boolean; abstained: boolean }>();
  for (const row of rows) {
    const expected = map(row.expected);
    const predicted = row.abstained || row.predicted === null ? null : map(row.predicted);
    matrix[expected]![predicted ?? 'abstain']!++;
    const isHigh = TIERS.indexOf(row.expected) >= 3;
    if (isHigh) high++;
    const delta = predicted === null ? null : TIERS.indexOf(predicted) - TIERS.indexOf(expected);
    const exact = delta === 0;
    if (exact) correct++;
    if (delta === null) { abstained++; if (isHigh) highAbstained++; }
    if (delta !== null && delta > 0) escalated++;
    if (delta !== null && delta >= 2) severeUp++;
    if (delta !== null && delta <= -2) severeDown++;
    const missed = isHigh && delta !== null && delta < 0;
    if (missed) under++;
    const group = groups.get(row.group_id) ?? { correct: true, severe: false, under: false, abstained: false };
    group.correct &&= exact;
    group.severe ||= delta !== null && Math.abs(delta) >= 2;
    group.under ||= missed;
    group.abstained ||= delta === null;
    groups.set(row.group_id, group);
  }
  const rate = (count: number, total = rows.length) => ({ count, denominator: total, rate: total ? count / total : null });
  const groupValues = [...groups.values()];
  return {
    tier_space: normalize ? 'four-tier-boundary-normalized' : 'five-tier',
    total: rows.length, accuracy: rows.length ? correct / rows.length : null, correct,
    confusion: matrix,
    per_tier: Object.fromEntries(tiers.map(t => {
      const total = Object.values(matrix[t]!).reduce((a, b) => a + b, 0);
      return [t, { total, recall: total ? matrix[t]![t]! / total : null, abstention: rate(matrix[t]!.abstain!, total) }];
    })),
    complex_apex_under_routing: rate(under, high),
    complex_apex_abstention: rate(highAbstained, high),
    unnecessary_escalation: rate(escalated),
    two_or_more_tier_errors: { ...rate(severeUp + severeDown), upward: severeUp, downward: severeDown },
    abstention: rate(abstained),
    groups: {
      total: groups.size,
      exact: rate(groupValues.filter(g => g.correct).length, groups.size),
      severe_error: rate(groupValues.filter(g => g.severe).length, groups.size),
      complex_apex_under_routing: rate(groupValues.filter(g => g.under).length, groups.size),
      abstention: rate(groupValues.filter(g => g.abstained).length, groups.size),
    },
  };
}

export function acceptance(candidate: ReturnType<typeof summarize>, baseline: ReturnType<typeof summarize>) {
  const checks = {
    accuracy_at_least_baseline: candidate.accuracy !== null && baseline.accuracy !== null && candidate.accuracy >= baseline.accuracy,
    fewer_complex_apex_misses: candidate.complex_apex_under_routing.count < baseline.complex_apex_under_routing.count,
    no_increase_severe_errors: candidate.two_or_more_tier_errors.count <= baseline.two_or_more_tier_errors.count,
    no_complex_apex_abstention: candidate.complex_apex_abstention.count === 0,
  };
  return { passed: Object.values(checks).every(Boolean), checks, strict_improvement_impossible_on_cohort: baseline.complex_apex_under_routing.count === 0 };
}

export function latency(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const percentile = (p: number) => sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)]! : null;
  return { samples: sorted.length, p50_ms: percentile(0.5), p95_ms: percentile(0.95), min_ms: sorted[0] ?? null, max_ms: sorted.at(-1) ?? null };
}
