import { MISSION_COUNT } from './catalog.mjs';

export const MIN_MISSION_FLIGHT = 20;
export const missionDefaults = Object.freeze({ missionLimit: 10, missionInterval: 45, missionAuto: true });

export function missionPolicy(settings = {}) {
  const { missionLimit, missionInterval, missionAuto } = settings;
  return {
    missionLimit: Number.isInteger(missionLimit) && missionLimit >= 1 && missionLimit <= MISSION_COUNT
      ? missionLimit : missionDefaults.missionLimit,
    missionInterval: Number.isInteger(missionInterval) && missionInterval >= 20 && missionInterval <= 180 && missionInterval % 5 === 0
      ? missionInterval : missionDefaults.missionInterval,
    missionAuto: missionAuto !== false,
  };
}
