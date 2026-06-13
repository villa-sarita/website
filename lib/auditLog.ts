/**
 * Audit log — records sensitive admin actions (cancellations today;
 * extensible to manual_create / edit / refund later).
 *
 * Storage: Upstash Redis sorted set keyed by ms-timestamp so we can later
 * `zrange` for a date window. Falls back to a JSON file in local dev.
 * Each entry is a JSON blob with shape `AuditEntry`.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { Redis } from '@upstash/redis';

export type AuditAction =
  | 'booking_cancelled'
  | 'booking_manual_created'
  | 'booking_edited'
  | 'booking_refunded'
  | 'booking_restored'
  | 'booking_deleted';

export interface AuditEntry {
  timestamp: string; // ISO
  actor: string; // 'admin' until we have per-user auth
  action: AuditAction;
  bookingId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

const KEY_AUDIT_LOG = 'audit:log';

let _redis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    _redis = null;
    return null;
  }
  _redis = new Redis({ url, token });
  return _redis;
}

const FS_PATH =
  process.env.AUDIT_LOG_PATH ?? join(process.cwd(), 'data', 'audit.json');

function readFs(): AuditEntry[] {
  try {
    if (!existsSync(FS_PATH)) return [];
    return JSON.parse(readFileSync(FS_PATH, 'utf8')) as AuditEntry[];
  } catch (err) {
    console.error('auditLog (fs): read failed', err);
    return [];
  }
}

function writeFs(entries: AuditEntry[]) {
  try {
    mkdirSync(dirname(FS_PATH), { recursive: true });
    writeFileSync(FS_PATH, JSON.stringify(entries, null, 2), 'utf8');
  } catch (err) {
    console.error('auditLog (fs): write failed', err);
  }
}

export async function logAdminAction(entry: Omit<AuditEntry, 'timestamp'>): Promise<void> {
  const full: AuditEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  const redis = getRedis();
  if (redis) {
    await redis.zadd(KEY_AUDIT_LOG, {
      score: Date.parse(full.timestamp),
      member: JSON.stringify(full),
    });
    return;
  }
  const entries = readFs();
  entries.push(full);
  writeFs(entries);
}

/** Read all audit entries newest-first. Mostly for future admin views. */
export async function listAuditLog(): Promise<AuditEntry[]> {
  const redis = getRedis();
  if (redis) {
    const raws = await redis.zrange<string[]>(KEY_AUDIT_LOG, 0, -1, { rev: true });
    if (!raws) return [];
    const out: AuditEntry[] = [];
    for (const raw of raws) {
      try {
        out.push(typeof raw === 'string' ? (JSON.parse(raw) as AuditEntry) : (raw as AuditEntry));
      } catch {
        /* skip corrupted */
      }
    }
    return out;
  }
  return readFs().slice().reverse();
}
