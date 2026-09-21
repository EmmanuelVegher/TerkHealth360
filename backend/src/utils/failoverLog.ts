/**
 * failoverLog.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Append-only failover event logger.
 *
 * Writes structured JSON lines to  logs/failover.log  in the project root.
 * This file survives database outages because it never touches PostgreSQL.
 * Each line is a self-contained JSON record that can be imported into any
 * audit or monitoring system.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs   from 'fs';
import path from 'path';

const LOG_DIR  = path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'failover.log');

// Ensure the log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export type FailoverEventType =
  | 'FAILOVER'           // Active layer changed
  | 'RECOVERY'           // A layer came back online
  | 'LAYER_DOWN'         // A layer went offline
  | 'CLOUD_FALLBACK'     // Switched to cloud mode
  | 'OFFLINE_MODE'       // All layers unreachable
  | 'SYNC_COMPLETE'      // Local ↔ cloud sync finished
  | 'REVERSE_SYNC'       // Cloud → local sync after recovery
  | 'HEALTH_CHECK'       // Periodic status snapshot
  | 'STARTUP';           // Server boot event

export interface FailoverEvent {
  timestamp:   string;
  eventType:   FailoverEventType;
  fromLayer?:  'PRIMARY' | 'STANDBY' | 'CLOUD' | 'OFFLINE';
  toLayer?:    'PRIMARY' | 'STANDBY' | 'CLOUD' | 'OFFLINE';
  description: string;
  metadata?:   Record<string, unknown>;
}

/**
 * Append a structured event to the failover log file.
 * Errors writing the log are swallowed (never crash the server over a log).
 */
export function logFailoverEvent(event: Omit<FailoverEvent, 'timestamp'>): void {
  const entry: FailoverEvent = {
    timestamp: new Date().toISOString(),
    ...event,
  };

  const line = JSON.stringify(entry) + '\n';

  try {
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch {
    // Silent — logging must never crash the application
  }

  // Also emit to stdout with a distinctive prefix
  const arrow = event.fromLayer && event.toLayer
    ? ` ${event.fromLayer} → ${event.toLayer}`
    : '';
  console.log(`[FailoverLog] [${entry.eventType}]${arrow} ${event.description}`);
}

/**
 * Read the last N events from the failover log.
 * Returns an empty array if the log file does not exist.
 */
export function readRecentEvents(limit = 50): FailoverEvent[] {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    const content = fs.readFileSync(LOG_FILE, 'utf8');
    const lines   = content.trim().split('\n').filter(Boolean);
    return lines
      .slice(-limit)
      .map(l => JSON.parse(l) as FailoverEvent)
      .reverse(); // newest first
  } catch {
    return [];
  }
}
