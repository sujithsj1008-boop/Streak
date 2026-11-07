import { validateAndMigrateState, STORAGE_SCHEMA_VERSION } from '../engine/streakEngine';

export const STORAGE_KEY = 'streakflow_pwa_state_v2';

export function saveStateToStorage(state: unknown): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function loadStateFromStorage(): ReturnType<typeof validateAndMigrateState> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return validateAndMigrateState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export { STORAGE_SCHEMA_VERSION };
