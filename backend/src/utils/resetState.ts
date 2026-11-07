import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HARD_RESET_FLAG_PATH = path.resolve(__dirname, '../../.hard_reset_active');

let hardResetMemoryFlag: boolean | null = null;

/**
 * Synchronously checks whether the system has undergone a Hard Reset (Full Factory Wipe).
 * When true, auto-seeders and mock in-memory stores must NOT re-populate demo staff,
 * duty rosters, wards/beds, inventories, or patient/mortuary/pathology/lab/cashier records.
 */
export function isHardResetActive(): boolean {
  if (hardResetMemoryFlag !== null) {
    return hardResetMemoryFlag;
  }
  try {
    hardResetMemoryFlag = fs.existsSync(HARD_RESET_FLAG_PATH);
    return hardResetMemoryFlag;
  } catch {
    return false;
  }
}

/**
 * Sets or clears the persistent Hard Reset flag on disk and in memory.
 */
export function setHardResetActive(active: boolean): void {
  hardResetMemoryFlag = active;
  try {
    if (active) {
      fs.writeFileSync(
        HARD_RESET_FLAG_PATH,
        JSON.stringify({ active: true, timestamp: new Date().toISOString() }, null, 2),
        'utf-8'
      );
    } else if (fs.existsSync(HARD_RESET_FLAG_PATH)) {
      fs.unlinkSync(HARD_RESET_FLAG_PATH);
    }
  } catch (err) {
    console.warn('Could not persist hard reset state flag:', err);
  }
}
