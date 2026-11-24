// Topaz Bay's single source of truth: money, wanted level, health, story
// progress, crew, garage, district standing and lifetime stats. The HUD, the
// status screen and the save system all read this one object.
import { TOPAZ_BAY_CONFIG } from './config.js';

export class TopazBayGameState {
  constructor() {
    this.money = 500;
    this.wanted = 0;
    this.health = 100;
    this.armor = 0;
    this.timeOfDay = TOPAZ_BAY_CONFIG.startTimeOfDay;
    this.weaponIndex = 0;
    this.radioStation = 0;
    this.radioOn = true;
    this.missionsDone = [];
    this.currentMission = null; // mission id while one is active
    this.missionStage = 0;
    this.racesWon = [];
    this.crew = {
      vera: { name: 'VERA "VOLT" KARA', role: 'HACKER', unlocked: true, cooldown: 0 },
      marco: { name: 'MARCO "TORQUE" DELA', role: 'DRIVER', unlocked: true, cooldown: 0 },
      juno: { name: 'JUNO "DOC" PALE', role: 'MEDIC', unlocked: false, cooldown: 0 },
    };
    this.garage = {
      engine: 0, armor: 0, paint: 0,
      ownedCars: [{ name: 'BAY RUNNER', color: 0x1b98a2, kind: 'sedan' }],
      activeCar: 0,
    };
    this.standing = { downtown: 10, marina: 10, harbor: 10, hills: 10, northgate: 10 };
    this.stats = {
      distanceDriven: 0, carsStolen: 0, shotsFired: 0, pedsHit: 0,
      copsEvaded: 0, explosions: 0, playSeconds: 0, bustedCount: 0, wastedCount: 0,
    };
    this.lastCrimeAt = -999;
    this.lastSaveLabel = 'NO SAVE YET';
  }

  get nextMissionId() {
    for (let id = 1; id <= 10; id += 1) {
      if (!this.missionsDone.includes(id)) return id;
    }
    return null;
  }

  get storyComplete() { return this.missionsDone.length >= 10; }

  addMoney(amount) { this.money = Math.max(0, this.money + amount); }

  raiseWanted(stars, now) {
    this.wanted = Math.min(TOPAZ_BAY_CONFIG.maxWanted, this.wanted + stars);
    this.lastCrimeAt = now;
  }

  lowerWanted(stars) { this.wanted = Math.max(0, this.wanted - stars); }

  gainStanding(districtId, amount) {
    if (districtId in this.standing) {
      this.standing[districtId] = Math.max(0, Math.min(100, this.standing[districtId] + amount));
    }
  }

  completeMission(id) {
    if (!this.missionsDone.includes(id)) this.missionsDone.push(id);
    this.currentMission = null;
    this.missionStage = 0;
  }

  toSaveData(playerPos, inCar) {
    return {
      v: 1, money: this.money, wanted: 0, health: this.health,
      timeOfDay: this.timeOfDay, weaponIndex: this.weaponIndex,
      radioStation: this.radioStation, missionsDone: this.missionsDone,
      racesWon: this.racesWon, crew: this.crew, garage: this.garage,
      standing: this.standing, stats: this.stats,
      playerPos: playerPos ? [playerPos.x, playerPos.z] : null, inCar: !!inCar,
      savedAt: new Date().toISOString(),
    };
  }

  applySaveData(data) {
    if (!data || data.v !== 1) return false;
    this.money = data.money ?? 500;
    this.health = data.health ?? 100;
    this.timeOfDay = data.timeOfDay ?? TOPAZ_BAY_CONFIG.startTimeOfDay;
    this.weaponIndex = data.weaponIndex ?? 0;
    this.radioStation = data.radioStation ?? 0;
    this.missionsDone = data.missionsDone ?? [];
    this.racesWon = data.racesWon ?? [];
    if (data.crew) this.crew = data.crew;
    if (data.garage) this.garage = data.garage;
    if (data.standing) this.standing = data.standing;
    if (data.stats) this.stats = data.stats;
    this.wanted = 0;
    this.currentMission = null;
    this.missionStage = 0;
    return true;
  }
}
