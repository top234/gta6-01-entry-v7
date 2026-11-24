// The people of Topaz Bay: low-poly walkers who stroll the sidewalks and the
// market plaza, scatter when a shot is fired nearby, and fall when hit.
import { TOPAZ_BAY_CONFIG, TOPAZ_BAY_PALETTE } from './config.js';
import { seededPick, seededRange } from './random.js';

export function buildPedestrianMesh(shirt, pants, skin) {
  const g = new THREE.Group();
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.32), new THREE.MeshLambertMaterial({ color: pants }));
  legs.position.y = 0.4; g.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.75, 0.36), new THREE.MeshLambertMaterial({ color: shirt }));
  torso.position.y = 1.15; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshLambertMaterial({ color: skin }));
  head.position.y = 1.85; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8, 0, Math.PI * 2, 0, 1.2), new THREE.MeshLambertMaterial({ color: 0x2b1d12 }));
  hair.position.y = 1.92; g.add(hair);
  g.userData.torso = torso;
  return g;
}

export function spawnTopazBayPedestrians(scene, city, rng, count = 34) {
  const peds = [];
  const skins = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];
  for (let i = 0; i < count; i += 1) {
    const nearPlaza = i < 10;
    const x = nearPlaza ? city.plaza.x + seededRange(rng, -20, 20) : seededRange(rng, -180, 180);
    const z = nearPlaza ? city.plaza.z + seededRange(rng, -12, 12) : seededRange(rng, -180, 170);
    const mesh = buildPedestrianMesh(
      seededPick(rng, TOPAZ_BAY_PALETTE.car), seededPick(rng, [0x2e4057, 0x444444, 0x7a5a3a, 0x3a6ea5]),
      seededPick(rng, skins),
    );
    mesh.position.set(x, 0, z);
    const ped = {
      mesh, x, z, heading: rng() * Math.PI * 2,
      speed: seededRange(rng, 1.2, 2.2), down: false, flee: 0,
      wanderT: seededRange(rng, 2, 6),
    };
    mesh.rotation.y = ped.heading;
    scene.add(mesh);
    peds.push(ped);
  }

  function update(dt, threatPos) {
    for (const ped of peds) {
      if (ped.down) continue;
      if (threatPos) {
        const dx = ped.x - threatPos.x, dz = ped.z - threatPos.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < 900) { ped.flee = 4; ped.heading = Math.atan2(dx, dz); }
      }
      ped.wanderT -= dt;
      if (ped.wanderT <= 0) {
        ped.wanderT = seededRange(rng, 2, 6);
        ped.heading += seededRange(rng, -1.2, 1.2);
      }
      const speed = ped.flee > 0 ? ped.speed * 3.2 : ped.speed;
      if (ped.flee > 0) ped.flee -= dt;
      ped.x += Math.sin(ped.heading) * speed * dt;
      ped.z += Math.cos(ped.heading) * speed * dt;
      if (ped.x > 195 || ped.x < -195 || ped.z > 195 || ped.z < -195) ped.heading += Math.PI;
      ped.mesh.position.set(ped.x, 0, ped.z);
      ped.mesh.rotation.y = ped.heading;
      // Simple walk bob so pedestrians read as alive, not statues.
      ped.mesh.position.y = Math.abs(Math.sin(performance.now() / 180 + ped.x)) * 0.06;
    }
  }

  function knockDown(x, z, radius) {
    let hit = 0;
    for (const ped of peds) {
      if (ped.down) continue;
      const dx = ped.x - x, dz = ped.z - z;
      if (dx * dx + dz * dz < radius * radius) {
        ped.down = true;
        ped.mesh.rotation.x = Math.PI / 2;
        ped.mesh.position.y = 0.3;
        hit += 1;
      }
    }
    return hit;
  }

  function nearestPed(x, z, maxDist) {
    let best = null, bestD = maxDist * maxDist;
    for (const ped of peds) {
      if (ped.down) continue;
      const dx = ped.x - x, dz = ped.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD) { best = ped; bestD = d2; }
    }
    return best;
  }

  return { peds, update, knockDown, nearestPed };
}
