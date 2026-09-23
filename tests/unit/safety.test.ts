import { describe, test, expect } from 'bun:test';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, statSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { classify } from '../../src/classifier.js';
import { digestKey, receipt } from '../../src/receipts.js';
import { observeTaskAssessment } from '../../integrations/task-assessment-observer.js';

const root = resolve(import.meta.dir, '../..');
describe('local assessment boundaries', () => {
  test('missing conversational context abstains', () => {
    for (const text of ['', 'continue', 'yes', 'fix it', null, {}, 'x'.repeat(100001), '```secret```']) expect(classify(text).abstained).toBe(true);
  });
  test('deterministic and independent of repeated prompt length', () => {
    const text = 'Explain what a distributed system is';
    expect(classify(text)).toEqual(classify(text));
    expect(classify(text).tier).toBe('trivial');
    expect(classify('Diagnose a distributed deadlock').tier).toBe('complex');
  });
  test('private key stable and files bounded', () => {
    const home = mkdtempSync(join(tmpdir(),'zo-task-gauge-key-'));
    expect(digestKey(home)).toBe(digestKey(home));
    expect(statSync(join(home,'digest.key')).mode & 0o777).toBe(0o600);
    expect(statSync(home).mode & 0o777).toBe(0o700);
    expect(receipt(home,{schema_version:1})).toBe(true);
    expect(statSync(join(home,'assessments.jsonl')).mode & 0o777).toBe(0o600);
    expect(receipt(home,'x'.repeat(10000))).toBe(false);
    writeFileSync(join(home,'assessments.jsonl'),'x'.repeat(4*1024*1024));
    expect(receipt(home,{})).toBe(false);
    expect(existsSync(join(home,'.receipt-lock'))).toBe(false);
  });
  test('observer preserves route on successful child, timeout, crash, missing executable, invalid input, off/live modes', () => {
    const temp = mkdtempSync(join(tmpdir(),'zo-task-gauge-timeout-'));
    mkdirSync(join(temp,'scripts'));
    const script = join(temp,'scripts/gauge.ts');
    const marker = join(temp,'marker');
    writeFileSync(script,`await Bun.sleep(500); await Bun.write(${JSON.stringify(marker)}, 'late');`);
    const baseline = Object.freeze({model:'unchanged'});
    const start = performance.now();
    expect(observeTaskAssessment(baseline,{}, {root:temp, timeoutMs:30})).toBe(baseline);
    expect(performance.now()-start).toBeLessThan(1000);
    Bun.sleepSync(550);
    expect(existsSync(marker)).toBe(false);
    for (const mode of ['off','live','invalid']) expect(observeTaskAssessment(baseline,{}, {root:temp, mode})).toBe(baseline);
    expect(observeTaskAssessment(baseline,{}, {root:temp,executable:'/does/not/exist'})).toBe(baseline);
    writeFileSync(script, 'process.exit(4)');
    expect(observeTaskAssessment(baseline,{}, {root:temp})).toBe(baseline);
    writeFileSync(script, 'process.exit(0)');
    expect(observeTaskAssessment(baseline,{}, {root:temp})).toBe(baseline);
    expect(observeTaskAssessment(baseline,{x:1n}, {root:temp})).toBe(baseline);
  });
  test('real child receipt contains neither task nor explicit model strings', () => {
    const home = mkdtempSync(join(tmpdir(),'zo-task-gauge-private-'));
    const phrase = 'Diagnose distributed race condition with private sentinel 527854';
    const input = { task_text:phrase, harness:'codex', current_tier:'trivial', task_model:'gpt-private-sentinel-99182' };
    const result = spawnSync('bun',[join(root,'scripts/gauge.ts'),'observe'],{
      input:JSON.stringify(input), encoding:'utf8', env:{...process.env,GAUGE_HOME:home,GAUGE_MODE:'shadow'},timeout:2000,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    const text = readFileSync(join(home,'assessments.jsonl'),'utf8');
    expect(text).not.toContain('527854'); expect(text).not.toContain('99182'); expect(text).not.toContain(phrase);
    expect(JSON.parse(text).task_digest).toMatch(/^[0-9a-f]{64}$/);
  });
  test('CLI rejects malformed input without echo', () => {
    const r = spawnSync('bun',[join(root,'scripts/gauge.ts'),'assess'],{input:'secret invalid json',encoding:'utf8'});
    expect(r.status).toBe(2); expect(r.stdout).not.toContain('secret');
  });
  test('killed receipt lock owner cannot disable future logging', async () => {
    const home = mkdtempSync(join(tmpdir(),'zo-task-gauge-lock-'));
    digestKey(home);
    receipt(home,{first:true});
    const child = Bun.spawn(['bun','-e',"import {Database} from 'bun:sqlite';const d=new Database(process.argv[1]);d.exec('BEGIN IMMEDIATE');console.log('locked');await Bun.sleep(10000);",join(home,'receipt-lock.sqlite')],{stdout:'pipe'});
    const reader = child.stdout.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toContain('locked');
    expect(receipt(home,{blocked:true})).toBe(false);
    child.kill('SIGKILL'); await child.exited;
    expect(receipt(home,{recovered:true})).toBe(true);
    expect(readFileSync(join(home,'assessments.jsonl'),'utf8')).toContain('recovered');
  });
  test('installer retains unrelated text and is idempotent with one backup', () => {
    const temp = mkdtempSync(join(tmpdir(),'zo-task-gauge-install-'));
    mkdirSync(join(temp,'src/routing'),{recursive:true});
    const original = "import { resolveModelForExecutor } from './routing/model-router.js';\nfunction unrelated(){return 'KEEP'}\nfunction route(){\n    return resolveModelForExecutor(\n      task,\n      executorId,\n      inferComplexity(task),\n      entry,\n      effectiveRoleModel,\n    )?.model;\n}";
    writeFileSync(join(temp,'src/orchestrator.ts'), original);
    const env={...process.env,GAUGE_BACKUPS:join(temp,'backups')};
    for (let i=0;i<2;i++) {
      const r = spawnSync('bun',[join(root,'scripts/install.ts'),'--swarm-root',temp,'--apply'],{env,encoding:'utf8'});
      expect(r.status).toBe(0);
      expect(r.stdout).toContain(i===0?'installed':'ALREADY_INSTALLED');
    }
    expect(readFileSync(join(temp,'src/orchestrator.ts'),'utf8')).toContain("function unrelated(){return 'KEEP'}");
    const backups=readdirSync(join(temp,'backups'));expect(backups).toHaveLength(1);
    expect(readFileSync(join(temp,'backups',backups[0]),'utf8')).toBe(original);
  });
});
