import { expect, test } from 'bun:test';
import { assertFrozen, sourceDigests, validateRows } from '../../evaluation/v2/run.js';

test('frozen candidate binds classifier, evaluator, rubric and reviewed inputs', () => {
  const digests = sourceDigests();
  expect(() => assertFrozen(digests)).not.toThrow();
  for (const path of Object.keys(digests)) {
    expect(() => assertFrozen({ ...digests, [path]: '0'.repeat(64) })).toThrow('Frozen source mismatch');
  }
  expect(() => assertFrozen({ ...digests, extra: 'x' })).toThrow();
  expect(() => assertFrozen({})).toThrow();
});

test('invalid, duplicate and unlabeled cohorts fail closed', () => {
  const row = { id: 'test-1', group_id: 'test-group', task_text: 'Synthetic task', tier: 'simple' as const };
  expect(validateRows([row])).toEqual([row]);
  for (const rows of [[], {}, [null], [{ ...row, tier: 'easy' }], [{ ...row, task_text: '' }], [row, row],
    [row, { ...row, id: 'test-2', task_text: ' Synthetic  task ' }]]) expect(() => validateRows(rows)).toThrow();
});
