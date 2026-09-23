#!/usr/bin/env bun
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
if (args.includes('--help') || !args.includes('--swarm-root')) {
  console.log('bun scripts/install.ts --swarm-root /absolute/packages/swarm [--apply]. Default dry run. Backs up exact current orchestrator; preserves unrelated edits. Restart/rebuild existing consumers to load new source.');
} else {
  const root = resolve(args[args.indexOf('--swarm-root') + 1]);
  const path = join(root, 'src/orchestrator.ts');
  const adapter = join(root, 'src/routing/task-assessment-observer.ts');
  const before = readFileSync(path, 'utf8');
  const anchor = "import { resolveModelForExecutor } from './routing/model-router.js';";
  const importLine = "import { observeTaskAssessment } from './routing/task-assessment-observer.js';";
  const start = '    return resolveModelForExecutor(\n      task,\n      executorId,\n      inferComplexity(task),\n      entry,\n      effectiveRoleModel,\n    )?.model;';
  const replacement = '    const tier = inferComplexity(task);\n    const route = resolveModelForExecutor(task, executorId, tier, entry, effectiveRoleModel);\n    return observeTaskAssessment(route?.model, {\n      task_text: task.task, harness: executorId, current_tier: tier,\n      current_model: route?.model, task_model: task.model, role_model: effectiveRoleModel, entry,\n    });';
  const contents = readFileSync(resolve(import.meta.dir, '../integrations/task-assessment-observer.ts'), 'utf8');
  if (before.includes(importLine) && before.includes(replacement) && existsSync(adapter) && readFileSync(adapter, 'utf8') === contents) {
    console.log('ALREADY_INSTALLED');
  } else {
    if (!before.includes(anchor) || before.split(start).length !== 2 || before.includes(importLine) || existsSync(adapter)) throw Error('Unsupported or partial integration; inspect before editing');
    const after = before.replace(anchor, anchor + '\n' + importLine).replace(start, replacement);
    if (!args.includes('--apply')) console.log('WOULD_INSTALL shadow observer');
    else {
      const digest = createHash('sha256').update(before).digest('hex');
      const backupDir = process.env.GAUGE_BACKUPS ?? resolve(import.meta.dir, '../../../Backups/gauge');
      mkdirSync(backupDir, { recursive: true, mode: 0o700 });
      const backup = join(backupDir, 'orchestrator-' + digest.slice(0,16) + '.ts');
      if (!existsSync(backup)) writeFileSync(backup, before, { mode: 0o600, flag: 'wx' });
      if (readFileSync(path, 'utf8') !== before) throw Error('Concurrent source change');
      writeFileSync(adapter, contents, { flag: 'wx' });
      writeFileSync(path, after);
      if (readFileSync(path, 'utf8') !== after || readFileSync(adapter, 'utf8') !== contents) throw Error('Readback failed');
      console.log(JSON.stringify({ installed: true, mode: 'shadow', backup, source_sha256: digest }));
    }
  }
}
