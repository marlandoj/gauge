import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { TIERS, type Tier } from './metrics.js';

type Review = {
  status: 'pending' | 'accepted' | 'corrected' | 'disputed';
  tier: Tier | null;
  rationale: string;
  reviewer: string;
  reviewed_at: string;
  authority_reference: string;
  case_sha256: string;
};
type Row = { id: string; group_id: string; task_text: string; proposed_tier: Tier; proposed_rationale: string; review: Review };
export type Packet = {
  schema_version: 1;
  cohort_id: string;
  purpose: 'development';
  provenance: 'agent-authored-developer-visible';
  rubric_sha256: string;
  cases: Row[];
};
const hash = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const validTier = (value: unknown): value is Tier => TIERS.includes(value as Tier);

export function caseDigest(packet: Packet, row: Packet['cases'][number]) {
  return hash(JSON.stringify([packet.schema_version, packet.cohort_id, packet.purpose, packet.provenance,
    packet.rubric_sha256, row.id, row.group_id, row.task_text, row.proposed_tier, row.proposed_rationale]));
}

export function inspect(value: unknown, now = Date.now()) {
  if (!object(value) || value.schema_version !== 1 || !nonempty(value.cohort_id)
    || value.purpose !== 'development' || value.provenance !== 'agent-authored-developer-visible'
    || typeof value.rubric_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.rubric_sha256)
    || !Array.isArray(value.cases) || value.cases.length === 0) throw Error('Invalid development review packet');
  const ids = new Set<string>(), tasks = new Set<string>(), groups = new Set<string>();
  const unresolved: string[] = [];
  const counts: Record<string, number> = Object.fromEntries(TIERS.map(t => [t, 0]));
  for (const row of value.cases) {
    if (!object(row) || !nonempty(row.id) || !nonempty(row.group_id) || !nonempty(row.task_text)
      || !validTier(row.proposed_tier) || !nonempty(row.proposed_rationale) || !object(row.review)) throw Error('Invalid case');
    const normalized = row.task_text.trim().replace(/\s+/g, ' ').toLowerCase();
    if (ids.has(row.id) || tasks.has(normalized)) throw Error('Duplicate ID or task');
    ids.add(row.id); tasks.add(normalized); groups.add(row.group_id);
    const review = row.review;
    if (!['pending', 'accepted', 'corrected', 'disputed'].includes(String(review.status))) throw Error('Invalid review status');
    if (review.status === 'pending' || review.status === 'disputed') { unresolved.push(row.id); continue; }
    if (!validTier(review.tier) || !nonempty(review.rationale) || !nonempty(review.reviewer)
      || !nonempty(review.authority_reference) || typeof review.reviewed_at !== 'string'
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(review.reviewed_at)
      || !Number.isFinite(Date.parse(review.reviewed_at)) || Date.parse(review.reviewed_at) > now
      || new Date(review.reviewed_at).toISOString().replace('.000Z', 'Z') !== review.reviewed_at.replace('.000Z', 'Z')) throw Error('Incomplete or invalid review attestation');
    if ((review.status === 'accepted') !== (review.tier === row.proposed_tier)) throw Error('Review status and tier disagree');
    if (review.case_sha256 !== caseDigest(value as Packet, row as Row)) throw Error('Reviewed case digest mismatch');
    counts[review.tier]!++;
  }
  return { cohort_id: value.cohort_id, cases: ids.size, groups: groups.size, reviewed: ids.size - unresolved.length, unresolved, reviewed_tiers: counts, ready: unresolved.length === 0 };
}

export function prepareFreeze(packet: unknown, source: string, rubric: string, now = Date.now()) {
  const summary = inspect(packet, now);
  if (!summary.ready) throw Error(`Human review unresolved for ${summary.unresolved.length} cases`);
  const typed = packet as Packet;
  if (hash(rubric) !== typed.rubric_sha256) throw Error('Rubric hash mismatch');
  if (JSON.stringify(JSON.parse(source)) !== JSON.stringify(packet)) throw Error('Source and packet disagree');
  return {
    schema_version: 1,
    cohort_id: typed.cohort_id,
    purpose: 'development',
    provenance: typed.provenance,
    review_attestation: 'supplied-not-independently-authenticated',
    frozen_at: new Date(now).toISOString(),
    source_sha256: hash(source),
    rubric_sha256: typed.rubric_sha256,
    independent_holdout: false,
    production_promotion_authorized: false,
    summary,
    cases: typed.cases.map(row => ({ id: row.id, group_id: row.group_id, task_text: row.task_text, tier: row.review.tier, proposed_tier: row.proposed_tier, proposed_rationale: row.proposed_rationale, review: row.review })),
  };
}

export async function freezeFile(input: string, output: string, rubricPath: string) {
  if (![input, output, rubricPath].every(isAbsolute)) throw Error('Use absolute file paths');
  const source = await readFile(input, 'utf8');
  const frozen = prepareFreeze(JSON.parse(source), source, await readFile(rubricPath, 'utf8'));
  await writeFile(output, JSON.stringify(frozen, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return frozen.summary;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help') {
    console.log('Usage: bun evaluation/review.ts check /absolute/review.json\n       bun evaluation/review.ts freeze /absolute/review.json /absolute/new-cohort.json /absolute/PROTOCOL.md\ncheck exits 2 while labels are pending/disputed. freeze requires complete review attestations and never overwrites output. Development only; does not authenticate reviewers or authorize routing.');
    return;
  }
  if (args[0] === 'check' && args.length === 2 && isAbsolute(args[1]!)) {
    const result = inspect(JSON.parse(await readFile(args[1]!, 'utf8')));
    console.log(JSON.stringify(result));
    if (!result.ready) process.exitCode = 2;
  } else if (args[0] === 'freeze' && args.length === 4) {
    console.log(JSON.stringify(await freezeFile(args[1]!, args[2]!, args[3]!)));
  } else throw Error('Invalid arguments; use --help');
}

if (import.meta.main) main().catch(error => {
  console.error(error instanceof SyntaxError ? 'Invalid JSON' : error instanceof Error ? error.message : 'Review failed');
  process.exitCode = 1;
});
