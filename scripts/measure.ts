import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { observeTaskAssessment } from '../integrations/task-assessment-observer.js';
import { latency } from '../evaluation/metrics.js';

const root = resolve(import.meta.dir,'..');
const home = mkdtempSync(join(tmpdir(),'zo-task-gauge-latency-'));
const input = {task_text:'Diagnose a distributed race condition',harness:'codex',current_tier:'trivial'};
const before=process.env.GAUGE_HOME;process.env.GAUGE_HOME=home;
const samples={fresh_process_cli:[] as number[],shared_observer_with_fresh_worker:[] as number[]};
for(let i=0;i<20;i++) {
  let start=performance.now();
  const r=spawnSync('bun',[join(root,'scripts/gauge.ts'),'assess'],{input:JSON.stringify(input),encoding:'utf8',timeout:2000});
  if(r.status!==0 || JSON.parse(r.stdout).abstained) throw Error('CLI smoke failure');
  samples.fresh_process_cli.push(performance.now()-start);
  start=performance.now();
  if(observeTaskAssessment('baseline',input,{root,swarmRoot:process.env.GAUGE_SWARM_ROOT ?? resolve(root,'../../packages/swarm')})!=='baseline') throw Error('Route changed');
  samples.shared_observer_with_fresh_worker.push(performance.now()-start);
}
const rows=readFileSync(join(home,'assessments.jsonl'),'utf8').trim().split('\n');
if(before===undefined) delete process.env.GAUGE_HOME;else process.env.GAUGE_HOME=before;
const output={samples:20,bun:Bun.version,scope:'Fresh process per call, warm filesystem cache. Includes startup, imports and resolver; observer includes keyed receipts and system timeout. No provider calls.',observations_completed:rows.length,measurements:Object.fromEntries(Object.entries(samples).map(([name,values])=>[name,latency(values)]))};
writeFileSync(join(root,'evaluation/latency.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output));
