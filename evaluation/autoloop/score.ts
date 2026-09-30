/**
 * Autoloop dev scorer. Prints ONE integer on stdout: the lexicographic quality
 * composite the loop minimises. Everything else goes to stderr.
 *
 * This scores DEVELOPMENT material only (115 reviewed cases: 60 original dev,
 * 25 approved D01-D25, 30 approved H01-H30). It never opens the scored
 * diagnostic cohort. A run that improves this number is a training result and
 * is not promotion evidence -- see evaluation/v4/PROTOCOL.md.
 *
 * Composite, lower is better, dominated by the acceptance gate in
 * evaluation/metrics.ts:
 *
 *   failed_checks * 100000   any acceptance-gate failure is fatal
 * + cpx_apex_abstention  * 1000
 * + cpx_apex_underroute  *  100
 * + severe_errors        *   10
 * + (1000 - accuracy*1000)     tie-break, prefers higher accuracy
 *
 * The baseline is a frozen copy of the classifier at arm time, so the gate is
 * always measured against the same starting point even as the target file is
 * edited. --folds N additionally runs grouped cross-validation and reports
 * fold spread to stderr; a full-cohort gain that a fold rejects is overfitting.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { summarize, type Prediction } from '../metrics.js';
import { classify as candidateClassify } from '../../src/classifier.js';
import { classify as baselineClassify } from './baseline-classifier.js';

type Row = { id: string; group_id: string; task_text: string; tier: string };

const root = resolve(import.meta.dir, '../..');
const args = process.argv.slice(2);
const foldsArg = args.indexOf('--folds');
const folds = foldsArg >= 0 ? Number(args[foldsArg + 1]) : 0;

function rowsFrom(path: string, label: string): Row[] {
  const abs = resolve(root, path);
  if (!existsSync(abs)) throw new Error(`missing dev source: ${path}`);
  const raw = readFileSync(abs, 'utf8').trim();
  const doc: unknown = path.endsWith('.jsonl')
    ? raw.split('\n').filter(Boolean).map((line) => JSON.parse(line))
    : JSON.parse(raw);
  const rows = (Array.isArray(doc) ? doc : ((doc as { cases?: unknown }).cases ?? [])) as Row[];
  if (!rows.length) throw new Error(`no rows from ${label}`);
  for (const row of rows) {
    if (typeof row.id !== 'string' || typeof row.group_id !== 'string'
      || typeof row.task_text !== 'string' || typeof row.tier !== 'string') {
      throw new Error(`malformed row in ${label}`);
    }
  }
  return rows;
}

const cohort: Row[] = [
  ...rowsFrom('evaluation/development.jsonl', 'original dev'),
  ...rowsFrom('evaluation/development-reviewed.json', 'D01-D25'),
  ...rowsFrom('evaluation/v2/cohort.json', 'H01-H30'),
];

const ids = new Set<string>();
for (const row of cohort) {
  if (ids.has(row.id)) throw new Error(`duplicate dev id: ${row.id}`);
  ids.add(row.id);
}

function predictions(fn: (v: unknown) => { tier: string | null; abstained: boolean }): Prediction[] {
  return cohort.map((row) => {
    const out = fn(row.task_text);
    return {
      id: row.id,
      group_id: row.group_id,
      expected: row.tier as Prediction['expected'],
      predicted: (out.tier ?? null) as Prediction['predicted'],
      abstained: out.abstained === true,
    };
  });
}

const baseline = summarize(predictions(baselineClassify as never));
const candidate = summarize(predictions(candidateClassify as never));

function failed(s: ReturnType<typeof summarize>, b: ReturnType<typeof summarize>): number {
  return [
    s.accuracy !== null && b.accuracy !== null && s.accuracy >= b.accuracy,
    // fewer_complex_apex_misses is deliberately omitted: the pinned v3 baseline already
    // scores 0 misses on the dev cohort, so this check is structurally unpassable here and
    // would pin every experiment in one band. It remains a hard gate on the fresh scored
    // cohort, whose baseline is not 0.
    s.two_or_more_tier_errors.count <= b.two_or_more_tier_errors.count,
    s.complex_apex_abstention.count === 0,
  ].filter((ok) => !ok).length;
}

const fails = failed(candidate, baseline);
const score =
  fails * 100000
  + candidate.complex_apex_abstention.count * 1000
  + candidate.complex_apex_under_routing.count * 100
  + candidate.two_or_more_tier_errors.count * 10
  + Math.round((1 - (candidate.accuracy ?? 0)) * 1000);

const pct = (n: number | null) => `${((n ?? 0) * 100).toFixed(1)}%`;
console.error(`cases=${cohort.length} groups=${baseline.groups.total}`);
console.error(`accuracy    ${candidate.correct}/${cohort.length} (${pct(candidate.accuracy)})  baseline ${baseline.correct}/${cohort.length} (${pct(baseline.accuracy)})`);
console.error(`cpx/apex under-routing ${candidate.complex_apex_under_routing.count}/${candidate.complex_apex_under_routing.denominator}  baseline ${baseline.complex_apex_under_routing.count}/${baseline.complex_apex_under_routing.denominator}`);
console.error(`cpx/apex abstention     ${candidate.complex_apex_abstention.count}/${candidate.complex_apex_abstention.denominator}  baseline ${baseline.complex_apex_abstention.count}/${baseline.complex_apex_abstention.denominator}`);
console.error(`severe errors           ${candidate.two_or_more_tier_errors.count}  baseline ${baseline.two_or_more_tier_errors.count}`);
console.error(`acceptance-gate failures ${fails}/3 (dev)`);

if (folds >= 2) {
  const byGroup = new Map<string, Row[]>();
  for (const row of cohort) {
    const bucket = byGroup.get(row.group_id);
    if (bucket) bucket.push(row);
    else byGroup.set(row.group_id, [row]);
  }
  const groups = [...byGroup.values()].sort((a, b) => a[0].id.localeCompare(b[0].id));
  const foldOf = new Map<string, number>();
  groups.forEach((g, i) => {
    const h = [...g[0].id].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
    foldOf.set(g[0].group_id, h % folds);
  });
  const scores: number[] = [];
  for (let f = 0; f < folds; f++) {
    const held = cohort.filter((row) => foldOf.get(row.group_id) === f);
    if (!held.length) continue;
    const acc = held.filter((row) => candidateClassify(row.task_text).tier === row.tier).length;
    const cpx = held.filter((row) => ['complex', 'apex'].includes(row.tier));
    const cpxBad = cpx.filter((row) => {
      const out = candidateClassify(row.task_text);
      const ti = ['trivial', 'simple', 'moderate', 'complex', 'apex'];
      return out.abstained || out.tier === null || ti.indexOf(out.tier) < ti.indexOf(row.tier);
    }).length;
    scores.push(acc - cpxBad * 2);
    console.error(`fold ${f} n=${held.length} correct=${acc} cpx_miss=${cpxBad}`);
  }
  if (scores.length) {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    console.error(`fold spread: mean=${mean.toFixed(2)} min=${Math.min(...scores)} max=${Math.max(...scores)} range=${Math.max(...scores) - Math.min(...scores)}`);
    if (Math.max(...scores) - Math.min(...scores) > 4) {
      console.error('WARN: wide fold spread indicates overfitting; do not accept on full-cohort gain alone.');
    }
  }
}

console.log(score);