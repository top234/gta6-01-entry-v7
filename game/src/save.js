// Save slots for Topaz Bay: three localStorage slots (A, B, C) shown on the
// title screen, plus an autosave after every completed mission or race.
import { TOPAZ_BAY_CONFIG } from './config.js';

export function saveTopazBayProgress(slot, state, playerPos, inCar) {
  try {
    const key = TOPAZ_BAY_CONFIG.saveKeyPrefix + slot;
    const data = state.toSaveData(playerPos, inCar);
    window.localStorage.setItem(key, JSON.stringify(data));
    state.lastSaveLabel = `SAVED TO SLOT ${slot}`;
    return true;
  } catch {
    return false;
  }
}

export function loadTopazBayProgress(slot, state) {
  try {
    const raw = window.localStorage.getItem(TOPAZ_BAY_CONFIG.saveKeyPrefix + slot);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!state.applySaveData(data)) return null;
    state.lastSaveLabel = `LOADED SLOT ${slot}`;
    return data;
  } catch {
    return null;
  }
}

export function listTopazBaySaveSlots() {
  return TOPAZ_BAY_CONFIG.saveSlots.map((slot) => {
    try {
      const raw = window.localStorage.getItem(TOPAZ_BAY_CONFIG.saveKeyPrefix + slot);
      if (!raw) return { slot, empty: true, label: 'EMPTY SLOT' };
      const data = JSON.parse(raw);
      const when = data.savedAt ? new Date(data.savedAt).toLocaleString() : '';
      return {
        slot, empty: false,
        label: `MISSIONS ${(data.missionsDone ?? []).length}/10 - $${data.money ?? 0} - ${when}`,
      };
    } catch {
      return { slot, empty: true, label: 'EMPTY SLOT' };
    }
  });
}
