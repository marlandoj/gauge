import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function observeTaskAssessment<T>(baseline: T, input: unknown, options: { root?: string; swarmRoot?: string; timeoutMs?: number; mode?: string; executable?: string } = {}): T {
  if ((options.mode ?? process.env.GAUGE_MODE ?? 'shadow') !== 'shadow') return baseline;
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const root = options.root ?? process.env.GAUGE_ROOT ?? resolve(here, '../../../../Skills/gauge');
    const script = resolve(root, 'scripts/gauge.ts');
    if (!existsSync(script)) return baseline;
    const raw = JSON.stringify(input);
    if (raw.length > 200_000) return baseline;
    const timeoutMs = Math.min(1000, Math.max(10, options.timeoutMs ?? 250));
    spawnSync('timeout', ['--signal=KILL', `${timeoutMs / 1000}s`, options.executable ?? process.env.GAUGE_BUN ?? 'bun', script, 'observe'], {
      input: raw, timeout: timeoutMs + 2000, killSignal: 'SIGKILL',
      maxBuffer: 8192, stdio: ['pipe', 'ignore', 'ignore'],
      env: { ...process.env, GAUGE_SWARM_ROOT: options.swarmRoot ?? process.env.GAUGE_SWARM_ROOT ?? resolve(here, '../..') },
    });
  } catch {}
  return baseline;
}
