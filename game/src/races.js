// Street races of Topaz Bay: three checkpoint circuits with two rival drivers
// each. Win the race, take the purse; lose it, and the mission that needed it
// fails with it.
import { buildStreetCar } from './vehicles.js';

export const STREET_RACES = [
  { id: 'bayfront', name: 'BAYFRONT SPRINT', prize: 1500, start: { x: 0, z: 160 },
    checkpoints: [{ x: 80, z: 160 }, { x: 160, z: 120 }, { x: 160, z: 40 }, { x: 80, z: 0 }, { x: 0, z: 0 }] },
  { id: 'harbor', name: 'HARBOR LOOP', prize: 2500, start: { x: 160, z: 0 },
    checkpoints: [{ x: 160, z: -80 }, { x: 80, z: -120 }, { x: 0, z: -80 }, { x: 80, z: 0 }, { x: 160, z: 0 }] },
  { id: 'hills', name: 'HILLS CLIMB', prize: 2000, start: { x: -160, z: -100 },
    checkpoints: [{ x: -80, z: -120 }, { x: 0, z: -160 }, { x: 80, z: -120 }, { x: 0, z: -40 }, { x: -160, z: -100 }] },
];

export function startStreetRace(ctx, raceId) {
  return ctx.races.beginRace(ctx, raceId);
}

export class StreetRaceManager {
  constructor(scene) {
    this.scene = scene;
    this.active = null; // { race, checkpoint, rivals, markers, time }
    this.lastResult = null;
    this.lastRaceId = null;
  }

  beginRace(ctx, raceId) {
    const race = STREET_RACES.find((r) => r.id === raceId);
    if (!race) return false;
    this.endRace(ctx, null);
    this.lastResult = null;
    this.lastRaceId = raceId;
    // Rivals: two sports cars that follow the checkpoint line.
    const rivals = [];
    for (let i = 0; i < 2; i += 1) {
      const mesh = buildStreetCar(i === 0 ? 0xd7263d : 0x9b5de5, 'sports');
      mesh.position.set(race.start.x + (i === 0 ? -6 : 6), 0, race.start.z);
      this.scene.add(mesh);
      rivals.push({ mesh, checkpoint: 0, speed: 0, heading: 0, pace: 26 + i * 2 });
    }
    const markers = race.checkpoints.map((cp) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(7, 0.7, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0xffd23f }),
      );
      ring.position.set(cp.x, 3.5, cp.z);
      this.scene.add(ring);
      return ring;
    });
    this.active = { race, checkpoint: 0, rivals, markers, time: 0, rivalBest: 0 };
    ctx.hud.setObjective(`RACE: ${race.name} — CHECKPOINT 1/${race.checkpoints.length}`);
    ctx.hud.setBanner(`RACE START — ${race.name}`);
    return true;
  }

  update(ctx, dt) {
    if (!this.active) return;
    const { race, rivals } = this.active;
    this.active.time += dt;
    const pos = ctx.playerPos();
    const inCar = !!ctx.driving.car;
    const cp = race.checkpoints[this.active.checkpoint];
    if (cp && inCar) {
      const d = Math.hypot(pos.x - cp.x, pos.z - cp.z);
      if (d < 12) {
        this.active.checkpoint += 1;
        this.active.markers[this.active.checkpoint - 1].material.color.set(0x2fbf71);
        if (this.active.checkpoint >= race.checkpoints.length) {
          this.finishRace(ctx, 'won');
          return;
        }
        ctx.hud.setObjective(`RACE: ${race.name} — CHECKPOINT ${this.active.checkpoint + 1}/${race.checkpoints.length}`);
        ctx.missionMarker = { x: race.checkpoints[this.active.checkpoint].x, z: race.checkpoints[this.active.checkpoint].z, label: 'NEXT CHECKPOINT' };
      } else {
        ctx.missionMarker = { x: cp.x, z: cp.z, label: 'NEXT CHECKPOINT' };
      }
    }
    // Rivals drive the same line; if one finishes first, the player loses.
    for (const rival of rivals) {
      const target = race.checkpoints[Math.min(rival.checkpoint, race.checkpoints.length - 1)];
      const dx = target.x - rival.mesh.position.x;
      const dz = target.z - rival.mesh.position.z;
      const dist = Math.hypot(dx, dz) || 1;
      const wantHeading = Math.atan2(dx, dz);
      let diff = wantHeading - rival.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      rival.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
      rival.speed = Math.min(rival.pace, rival.speed + 18 * dt);
      rival.mesh.position.x += Math.sin(rival.heading) * rival.speed * dt;
      rival.mesh.position.z += Math.cos(rival.heading) * rival.speed * dt;
      rival.mesh.rotation.y = rival.heading + Math.PI;
      if (dist < 12) {
        rival.checkpoint += 1;
        this.active.rivalBest = Math.max(this.active.rivalBest, rival.checkpoint);
        if (rival.checkpoint >= race.checkpoints.length) {
          this.finishRace(ctx, 'lost');
          return;
        }
      }
    }
  }

  finishRace(ctx, result) {
    if (!this.active) return;
    const { race } = this.active;
    this.lastResult = result;
    if (result === 'won') {
      ctx.state.addMoney(race.prize);
      if (!ctx.state.racesWon.includes(race.id)) ctx.state.racesWon.push(race.id);
      ctx.hud.setBanner(`RACE WON — +$${race.prize}`);
      ctx.autosave();
    } else {
      ctx.hud.setBanner('RACE LOST');
    }
    this.endRace(ctx, result);
  }

  endRace(ctx, result) {
    if (!this.active) return;
    for (const rival of this.active.rivals) this.scene.remove(rival.mesh);
    for (const marker of this.active.markers) this.scene.remove(marker);
    this.active = null;
    ctx.missionMarker = null;
  }
}
