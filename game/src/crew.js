// Reno's crew: Vera the hacker, Marco the driver and Juno the medic. They
// follow on foot, ride along in the car, and each brings one ability on a
// cooldown — Grid Hack, Turbo Slipstream and Field Patch.
import { buildPedestrianMesh } from './pedestrians.js';
import { resolveBuildingCollision } from './city.js';

export const TOPAZ_BAY_CREW_ABILITIES = {
  vera: { key: '1', name: 'GRID HACK', desc: 'Vera kills the cameras: wanted -2', cooldown: 60 },
  marco: { key: '2', name: 'TURBO SLIPSTREAM', desc: 'Marco tunes the engine live: +50% speed for 6s', cooldown: 45 },
  juno: { key: '3', name: 'FIELD PATCH', desc: 'Juno patches Reno up: full health', cooldown: 45 },
};

export class CrewRoster {
  constructor(scene) {
    this.members = {};
    const defs = [
      ['vera', 0x9b5de5, 0x222222, 0xf1c27d],
      ['marco', 0xee964b, 0x2e4057, 0xc68642],
      ['juno', 0x7fd4c1, 0xffffff, 0x8d5524],
    ];
    for (const [id, shirt, pants, skin] of defs) {
      const mesh = buildPedestrianMesh(shirt, pants, skin);
      mesh.scale.setScalar(1.1);
      mesh.visible = false;
      scene.add(mesh);
      this.members[id] = { id, mesh, x: 0, z: 0, heading: 0, visible: false };
    }
    this.turboUntil = 0;
  }

  // Place the crew around the player; Juno only shows once unlocked.
  deploy(state, x, z) {
    const offsets = { vera: [-2.5, 1.5], marco: [2.5, 1.5], juno: [0, -3] };
    for (const id of Object.keys(this.members)) {
      const m = this.members[id];
      const unlocked = state.crew[id].unlocked;
      m.visible = unlocked;
      m.mesh.visible = unlocked;
      const [ox, oz] = offsets[id];
      m.x = x + ox; m.z = z + oz;
      m.mesh.position.set(m.x, 0, m.z);
    }
  }

  setInCar(inCar) {
    // In a car the crew rides along: hide the followers, show them on exit.
    for (const m of Object.values(this.members)) {
      if (m.visible) m.mesh.visible = !inCar;
    }
  }

  update(dt, playerPos, colliders, playerInCar) {
    if (playerInCar) return;
    for (const m of Object.values(this.members)) {
      if (!m.visible) continue;
      const dx = playerPos.x - m.x, dz = playerPos.z - m.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 4.5) {
        const speed = dist > 18 ? 13 : 8;
        m.heading = Math.atan2(dx, dz);
        const nx = m.x + Math.sin(m.heading) * speed * dt;
        const nz = m.z + Math.cos(m.heading) * speed * dt;
        const fixed = resolveBuildingCollision(colliders, nx, nz, 0.7);
        m.x = fixed.x; m.z = fixed.z;
        m.mesh.position.set(m.x, Math.abs(Math.sin(performance.now() / 150 + m.x)) * 0.06, m.z);
        m.mesh.rotation.y = m.heading;
      }
    }
  }

  // Fire a crew ability. Returns a status line for the HUD, or null.
  useAbility(state, id, now, ctx) {
    const member = state.crew[id];
    const ability = TOPAZ_BAY_CREW_ABILITIES[id];
    if (!member || !member.unlocked) return `${ability.name}: CREW MEMBER NOT UNLOCKED YET`;
    if (member.cooldown > 0) return `${ability.name}: READY IN ${Math.ceil(member.cooldown)}s`;
    member.cooldown = ability.cooldown;
    if (id === 'vera') {
      state.lowerWanted(2);
      ctx.police.syncToWanted(state.wanted, ctx.playerPos());
      return 'VERA: GRID HACK — CAMERAS DOWN, WANTED -2';
    }
    if (id === 'marco') {
      this.turboUntil = now + 6;
      return 'MARCO: TURBO SLIPSTREAM — FULL SEND FOR 6s';
    }
    state.health = 100;
    return 'JUNO: FIELD PATCH — HEALTH RESTORED';
  }

  get turboActive() {
    return performance.now() / 1000 < this.turboUntil;
  }

  tickCooldowns(state, dt) {
    for (const member of Object.values(state.crew)) {
      if (member.cooldown > 0) member.cooldown = Math.max(0, member.cooldown - dt);
    }
  }
}
