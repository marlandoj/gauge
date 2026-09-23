import { expect, test } from 'bun:test';
import { assertFrozen, sourceDigests, reviewedDevelopment, validateDiagnostic, assertAssessmentParity } from '../../evaluation/v3/run.js';
import { TIERS, classify } from '../../src/classifier.js';
import { assess } from '../../src/assess.js';

test('v3 binds approved development and new evaluation code', () => {
  const digests = sourceDigests();
  expect(() => assertFrozen(digests)).not.toThrow();
  for (const path of Object.keys(digests)) {
    expect(() => assertFrozen({ ...digests, [path]: 'invalid' })).toThrow();
  }
  expect(reviewedDevelopment()).toHaveLength(55);
  expect(digests['evaluation/v2/label-approval.json']).toHaveLength(64);
});

test('resolver failure cannot count as a usable candidate prediction', async () => {
  const text = 'Diagnose a distributed race condition';
  const classification = classify(text);
  const unavailable = await assess({ task_text: text, harness: 'codex', current_tier: 'simple' }, 'test');
  expect(unavailable.proposed_tier).toBe(classification.tier);
  expect(() => assertAssessmentParity(classification, unavailable)).toThrow('Production parity failure');
});

test('fresh diagnostic rejects incomplete, imbalanced or unreasoned cohorts', () => {
  const rows = Array.from({ length: 40 }, (_, i) => ({
    id: `N${i}`, group_id: `fresh-${i}`, task_text: `Synthetic evaluation case ${i}`,
    tier: TIERS[Math.floor(i / 8)], rationale: 'Synthetic validation fixture',
  }));
  expect(validateDiagnostic(rows)).toHaveLength(40);
  for (const changed of [rows.slice(1), rows.map(r => ({ ...r, tier: 'simple' })),
    rows.map(r => ({ ...r, group_id: 'same-group' })), rows.map(r => ({ ...r, rationale: '' }))]) {
    expect(() => validateDiagnostic(changed)).toThrow();
  }
});
