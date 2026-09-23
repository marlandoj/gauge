import { test, expect } from 'bun:test';
import { summarize, acceptance, latency, type Prediction } from './metrics.js';

test('abstentions stay in recall and severe errors retain direction', () => {
  const rows: Prediction[] = [
    { id: 'a', group_id: 'pair', expected: 'apex', predicted: 'simple', abstained: false },
    { id: 'b', group_id: 'pair', expected: 'apex', predicted: null, abstained: true },
    { id: 'c', group_id: 'single', expected: 'simple', predicted: 'complex', abstained: false },
  ];
  const result = summarize(rows);
  expect(result.accuracy).toBe(0);
  expect(result.confusion.apex!.abstain).toBe(1);
  expect(result.complex_apex_under_routing).toEqual({ count: 1, denominator: 2, rate: 0.5 });
  expect(result.complex_apex_abstention.count).toBe(1);
  expect(result.two_or_more_tier_errors).toMatchObject({ count: 2, upward: 1, downward: 1 });
  expect(result.groups.exact.count).toBe(0);
  expect(result.groups.severe_error.count).toBe(2);
});

test('boundary comparison maps both sides while five-tier comparison stays strict', () => {
  const rows: Prediction[] = [{ id: 'a', group_id: 'g', expected: 'apex', predicted: 'complex', abstained: false }];
  expect(summarize(rows).accuracy).toBe(0);
  expect(summarize(rows, true).accuracy).toBe(1);
  expect(summarize(rows, true).complex_apex_under_routing.count).toBe(0);
});

test('zero baseline misses cannot satisfy strict improvement', () => {
  const metrics = summarize([{ id: 'a', group_id: 'g', expected: 'complex', predicted: 'complex', abstained: false }]);
  expect(acceptance(metrics, metrics).passed).toBe(false);
  expect(acceptance(metrics, metrics).strict_improvement_impossible_on_cohort).toBe(true);
});

test('latency uses nearest rank and preserves empty measurements', () => {
  expect(latency([5, 1, 4, 3, 2])).toMatchObject({ p50_ms: 3, p95_ms: 5, samples: 5 });
  expect(latency([])).toMatchObject({ p50_ms: null, p95_ms: null, samples: 0 });
});
