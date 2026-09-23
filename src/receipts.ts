import { constants, mkdirSync, openSync, closeSync, readFileSync, writeFileSync, statSync, appendFileSync, unlinkSync, chmodSync, linkSync, fchmodSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { Database } from 'bun:sqlite';

export function digestKey(home: string): string {
  mkdirSync(home, { recursive: true, mode: 0o700 });
  chmodSync(home, 0o700);
  const path = join(home, 'digest.key');
  const temporary = join(home, '.key-' + randomBytes(12).toString('hex'));
  writeFileSync(temporary, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 });
  try {
    try { linkSync(temporary, path); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e; }
  } finally { unlinkSync(temporary); }
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    fchmodSync(fd, 0o600);
    const key = readFileSync(fd, 'utf8').trim();
    if (!/^[a-f0-9]{64}$/.test(key)) throw Error('invalid_digest_key');
    return key;
  } finally { closeSync(fd); }
}

export function receipt(home: string, value: unknown): boolean {
  const line = JSON.stringify(value) + '\n';
  if (Buffer.byteLength(line) > 8192) return false;
  const lock = join(home, 'receipt-lock.sqlite');
  const fd = openSync(lock, constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW, 0o600);
  closeSync(fd);
  const database = new Database(lock);
  try {
    try { database.exec('PRAGMA busy_timeout=0; BEGIN IMMEDIATE'); } catch { return false; }
    const path = join(home, 'assessments.jsonl');
    try { if (statSync(path).size + Buffer.byteLength(line) > 4 * 1024 * 1024) return false; }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    const log = openSync(path, constants.O_APPEND | constants.O_CREAT | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    try { fchmodSync(log, 0o600); appendFileSync(log, line); } finally { closeSync(log); }
    database.exec('COMMIT');
    return true;
  } finally { database.close(); }
}
