#!/usr/bin/env bun
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { randomBytes, createHmac } from 'node:crypto';
import { assess, loadResolver, type Input } from '../src/assess.js';
import { digestKey, receipt } from '../src/receipts.js';

const command = process.argv[2];
if (command === '--help' || !command) {
  console.log('Gauge: assess | observe (JSON stdin). GAUGE_SWARM_ROOT=swarm package path; GAUGE_HOME=private receipt directory. Shadow only; GAUGE_MODE=off disables observer. No downloads or provider calls.');
} else if (command === 'assess' || command === 'observe') {
  try {
    if (command === 'observe' && process.env.GAUGE_MODE === 'off') process.exit(0);
    let raw = '';
    for await (const chunk of Bun.stdin.stream()) {
      raw += new TextDecoder().decode(chunk);
      if (raw.length > 200_000) throw Error('input_limit');
    }
    const input = JSON.parse(raw) as Input;
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('invalid_input');
    const home = process.env.GAUGE_HOME ?? resolve(homedir(), '.gauge');
    const key = command === 'observe' ? digestKey(home) : randomBytes(32).toString('hex');
    let resolver;
    try { resolver = await loadResolver(process.env.GAUGE_SWARM_ROOT ?? resolve(import.meta.dir, '../../../packages/swarm')); } catch {}
    const report = await assess(input, key, resolver);
    if (command === 'observe') {
      const route = report.proposed_route;
      receipt(home, { ...report, proposed_route: route ? {
        tier: route.tier, source: route.source, catalogSource: route.catalogSource,
        model_digest: createHmac('sha256', key).update(route.model).digest('hex'),
      } : null });
    }
    else console.log(JSON.stringify(report));
  } catch {
    if (command === 'assess') { console.log(JSON.stringify({ schema_version: 1, abstained: true, reasons: ['invalid_input'], proposed_route: null })); process.exitCode = 2; }
  }
} else { console.error('Unknown command. Use --help.'); process.exitCode = 2; }
