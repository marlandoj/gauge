import { test, expect } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspect, prepareFreeze, freezeFile, caseDigest, type Packet } from '../../evaluation/review.js';

const rubric = 'Fixture rubric';
const now = Date.parse('2026-09-23T12:00:00Z');
function packet(): Packet {
  const value: Packet = { schema_version: 1, cohort_id: 'fixture', purpose: 'development', provenance: 'agent-authored-developer-visible', rubric_sha256: createHash('sha256').update(rubric).digest('hex'), cases: [
    { id: 'a', group_id: 'g', task_text: 'Locate the configured port.', proposed_tier: 'trivial', proposed_rationale: 'Direct lookup.', review: { status: 'accepted', tier: 'trivial', rationale: 'Agreed direct lookup.', reviewer: 'Fixture reviewer', reviewed_at: '2026-09-23T11:00:00Z', authority_reference: 'synthetic-test-only', case_sha256: '' } },
  ] };
  value.cases[0]!.review.case_sha256 = caseDigest(value, value.cases[0]!);
  return value;
}
const freeze = (value: unknown, protocol = rubric) => prepareFreeze(value, JSON.stringify(value), protocol, now);

test('pending and disputed labels cannot freeze even when a tier is supplied', () => {
  for (const status of ['pending', 'disputed'] as const) {
    const p = packet(); p.cases[0]!.review.status = status;
    expect(inspect(p, now)).toMatchObject({ ready: false, unresolved: ['a'], reviewed: 0 });
    expect(() => freeze(p)).toThrow('unresolved');
  }
});
test('validated reviews retain provenance and cannot become holdout or promotion evidence', () => {
  const output = freeze(packet());
  expect(output).toMatchObject({ purpose: 'development', independent_holdout: false, production_promotion_authorized: false, review_attestation: 'supplied-not-independently-authenticated' });
  expect(output.cases[0]).toMatchObject({ tier: 'trivial', proposed_tier: 'trivial' });
});
test('corrections preserve original proposed tier and require consistent review status', () => {
  const p = packet(); p.cases[0]!.review.tier = 'simple';
  expect(() => freeze(p)).toThrow('disagree');
  p.cases[0]!.review.status = 'corrected';
  expect(freeze(p).cases[0]).toMatchObject({ tier: 'simple', proposed_tier: 'trivial' });
  p.cases[0]!.review.tier = 'trivial';
  expect(() => freeze(p)).toThrow('disagree');
});
test('empty, malformed, and falsely independent packets fail closed', () => {
  for (const value of [null, [], {}, { ...packet(), cases: [] }, { ...packet(), purpose: 'heldout' }, { ...packet(), provenance: 'human-authored' }]) expect(() => inspect(value)).toThrow();
});
test('reviewer, authority, rationale and valid nonfuture date are mandatory', () => {
  for (const key of ['reviewer', 'authority_reference', 'rationale', 'reviewed_at'] as const) {
    const p = packet(); p.cases[0]!.review[key] = '';
    expect(() => freeze(p)).toThrow('attestation');
  }
  for (const date of ['tomorrow', '2026-09-24T11:00:00Z', '2026-02-30T11:00:00Z', '2026-09-23']) {
    const p = packet(); p.cases[0]!.review.reviewed_at = date;
    expect(() => freeze(p)).toThrow('attestation');
  }
});
test('invalid tiers and statuses cannot be scored', () => {
  const p = JSON.parse(JSON.stringify(packet()));
  p.cases[0].review.tier = 'heavy'; expect(() => freeze(p)).toThrow();
  p.cases[0].review.tier = 'trivial'; p.cases[0].review.status = 'approved'; expect(() => freeze(p)).toThrow();
});
test('duplicate cases and normalized duplicate tasks fail', () => {
  const p = packet(); p.cases.push(structuredClone(p.cases[0]!));
  expect(() => freeze(p)).toThrow('Duplicate');
  p.cases[1]!.id = 'b'; p.cases[1]!.task_text = '  LOCATE   the configured port.  ';
  expect(() => freeze(p)).toThrow('Duplicate');
});
test('rubric and source hashes bind the frozen cohort', () => {
  expect(() => freeze(packet(), 'Changed rubric')).toThrow('Rubric');
  expect(() => prepareFreeze(packet(), '{}', rubric, now)).toThrow('disagree');
});
test('an attestation is invalidated by edited task, grouping, proposed label or rubric', () => {
  for (const field of ['task_text', 'group_id', 'proposed_rationale'] as const) {
    const p = packet(); p.cases[0]![field] += ' changed';
    expect(() => freeze(p)).toThrow('digest');
  }
  const p = packet(); p.cases[0]!.proposed_tier = 'simple'; p.cases[0]!.review.tier = 'simple';
  expect(() => freeze(p)).toThrow('digest');
  const q = packet(); q.rubric_sha256 = 'a'.repeat(64);
  expect(() => freeze(q)).toThrow('digest');
});
test('review CLI rejects pending labels and creates no frozen output', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zo-task-gauge-review-cli-'));
  try {
    const input = join(root, 'review.json'), output = join(root, 'frozen.json'), protocol = join(root, 'PROTOCOL.md');
    const p = packet(); p.cases[0]!.review.status = 'pending';
    await writeFile(input, JSON.stringify(p)); await writeFile(protocol, rubric);
    const cli = new URL('../../evaluation/review.ts', import.meta.url).pathname;
    const check = Bun.spawnSync([process.execPath, cli, 'check', input]);
    expect(check.exitCode).toBe(2);
    expect(JSON.parse(check.stdout.toString()).ready).toBe(false);
    const blocked = Bun.spawnSync([process.execPath, cli, 'freeze', input, output, protocol]);
    expect(blocked.exitCode).toBe(1);
    expect(await Bun.file(output).exists()).toBe(false);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('on-disk freeze never overwrites and writes owner-only artifacts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zo-task-gauge-review-'));
  try {
    const input = join(root, 'review.json'), output = join(root, 'frozen.json'), protocol = join(root, 'PROTOCOL.md');
    await writeFile(input, JSON.stringify(packet())); await writeFile(protocol, rubric);
    await freezeFile(input, output, protocol);
    const original = await readFile(output, 'utf8');
    expect((await stat(output)).mode & 0o777).toBe(0o600);
    await expect(freezeFile(input, output, protocol)).rejects.toThrow();
    expect(await readFile(output, 'utf8')).toBe(original);
    await expect(freezeFile('relative.json', output, protocol)).rejects.toThrow('absolute');
  } finally { await rm(root, { recursive: true, force: true }); }
});
