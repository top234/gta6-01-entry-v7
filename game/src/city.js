// Topaz Bay itself: a sun-soaked coastal grid city — roads, towers downtown,
// low stucco houses in Sunset Hills, a sandy beach and marina in the south,
// docks and cranes at Old Harbor, palms, streetlights and a market plaza.
// Returns the colliders, road lines and landmark markers the rest of the game
// drives, walks and races on.
import { TOPAZ_BAY_CONFIG, TOPAZ_BAY_PALETTE, districtAt } from './config.js';
import { seededPick, seededRange } from './random.js';

export function buildTopazBayCity(scene, rng) {
  const { cityHalf, roadGap, roadWidth } = TOPAZ_BAY_CONFIG;
  const colliders = [];
  const lamps = [];
  const mat = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, ...opts });

  // Ground: warm grass-sand base, then the beach strip and the sea beyond it.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(cityHalf * 2 + 400, cityHalf * 2 + 400), mat(0x9db884));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.05, 0); scene.add(ground);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(560, 60), mat(TOPAZ_BAY_PALETTE.sand));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0, 185); scene.add(sand);
  const seaSouth = new THREE.Mesh(new THREE.PlaneGeometry(900, 300), mat(TOPAZ_BAY_PALETTE.sea));
  seaSouth.rotation.x = -Math.PI / 2; seaSouth.position.set(0, 0.1, 360); scene.add(seaSouth);
  const seaEast = new THREE.Mesh(new THREE.PlaneGeometry(300, 700), mat(TOPAZ_BAY_PALETTE.sea));
  seaEast.rotation.x = -Math.PI / 2; seaEast.position.set(360, 0.1, 0); scene.add(seaEast);

  // Grid roads: dark asphalt strips with pale sidewalks on both edges.
  const roadLines = [];
  for (let c = -160; c <= 160; c += roadGap) roadLines.push(c);
  const roadMat = mat(TOPAZ_BAY_PALETTE.road);
  const walkMat = mat(TOPAZ_BAY_PALETTE.sidewalk);
  for (const c of roadLines) {
    for (const [w, d, x, z] of [
      [roadWidth + 4, cityHalf * 2, c, 0], [cityHalf * 2, roadWidth + 4, 0, c],
    ]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(w, d), walkMat);
      walk.rotation.x = -Math.PI / 2; walk.position.set(x, 0.01, z); scene.add(walk);
    }
    const ns = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, cityHalf * 2), roadMat);
    ns.rotation.x = -Math.PI / 2; ns.position.set(c, 0.02, 0); scene.add(ns);
    const ew = new THREE.Mesh(new THREE.PlaneGeometry(cityHalf * 2, roadWidth), roadMat);
    ew.rotation.x = -Math.PI / 2; ew.position.set(0, 0.02, c); scene.add(ew);
    // Dashed centre line, north-south and east-west.
    const dashMat = mat(0xf5f0dc);
    for (let t = -180; t <= 180; t += 24) {
      const d1 = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 4), dashMat);
      d1.rotation.x = -Math.PI / 2; d1.position.set(c, 0.03, t); scene.add(d1);
      const d2 = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.7), dashMat);
      d2.rotation.x = -Math.PI / 2; d2.position.set(t, 0.03, c); scene.add(d2);
    }
  }

  // Buildings fill every block between roads; downtown grows tall towers.
  const roofMat = (c) => mat(c);
  for (let bx = -180; bx < 180; bx += roadGap) {
    for (let bz = -180; bz < 180; bz += roadGap) {
      const cx = bx + roadGap / 2, cz = bz + roadGap / 2;
      if (cz > 140) continue; // beach blocks stay open
      if (cx > 140 && cz > 100) continue; // harbor yard stays open
      if (Math.abs(cx) < 25 && Math.abs(cz - 150) < 25) continue; // marina plaza
      const district = districtAt(cx, cz);
      const tall = district.tall;
      const count = tall ? 1 : (rng() < 0.5 ? 2 : 1);
      for (let i = 0; i < count; i += 1) {
        const w = tall ? seededRange(rng, 16, 22) : seededRange(rng, 9, 15);
        const d = tall ? seededRange(rng, 16, 22) : seededRange(rng, 9, 15);
        const h = tall ? seededRange(rng, 30, 70) : seededRange(rng, 6, 14);
        const ox = count === 1 ? 0 : (i === 0 ? -8 : 8);
        const oz = count === 1 ? 0 : (i === 0 ? -8 : 8);
        const x = cx + ox, z = cz + oz;
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          mat(seededPick(rng, TOPAZ_BAY_PALETTE.building)),
        );
        body.position.set(x, h / 2, z); scene.add(body);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.8, d + 0.6), roofMat(seededPick(rng, TOPAZ_BAY_PALETTE.roof)));
        roof.position.set(x, h + 0.4, z); scene.add(roof);
        // Lit windows: a slightly inset darker band with emissive strip.
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.92, Math.min(h * 0.7, 12), d * 0.92),
          new THREE.MeshLambertMaterial({ color: 0x2c4a5e, emissive: 0x1a2c38 }),
        );
        win.position.set(x, h * 0.55, z); scene.add(win);
        colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      }
    }
  }

  // Marina Plaza: market stalls, benches and palms where missions meet.
  const plaza = { x: 0, z: 150 };
  const plazaFloor = new THREE.Mesh(new THREE.PlaneGeometry(46, 30), mat(0xd8cdb8));
  plazaFloor.rotation.x = -Math.PI / 2; plazaFloor.position.set(plaza.x, 0.03, plaza.z); scene.add(plazaFloor);
  for (let i = -2; i <= 2; i += 1) {
    const stall = new THREE.Group();
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 2.4), mat(0x8a5a3b));
    counter.position.y = 0.6; stall.add(counter);
    const awn = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.25, 3), mat(seededPick(rng, [0xd7263d, 0x1b98a2, 0xf4d35e, 0xee964b])));
    awn.position.y = 2.6; stall.add(awn);
    for (const [px, pz] of [[-2, -1.2], [2, -1.2], [-2, 1.2], [2, 1.2]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6), mat(0x666666));
      pole.position.set(px, 1.3, pz); stall.add(pole);
    }
    stall.position.set(plaza.x + i * 8, 0, plaza.z - 10); scene.add(stall);
    colliders.push({ minX: plaza.x + i * 8 - 2.3, maxX: plaza.x + i * 8 + 2.3, minZ: plaza.z - 11.5, maxZ: plaza.z - 8.5 });
  }

  // Harbor: wooden docks, stacked containers and two cranes on the east edge.
  for (const dz of [-60, 0, 60]) {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(46, 1.2, 8), mat(0x7a5a3a));
    dock.position.set(196, 0.6, dz); scene.add(dock);
  }
  for (let i = 0; i < 14; i += 1) {
    const c = new THREE.Mesh(
      new THREE.BoxGeometry(6, 2.6, 2.6),
      mat(seededPick(rng, [0xd7263d, 0x1b98a2, 0xf4d35e, 0x2e4057, 0x8ac926])),
    );
    c.position.set(160 + (i % 4) * 8, 1.3 + Math.floor(i / 4) * 2.7, 110 + Math.floor(i / 4) * 8 - (i % 2) * 4);
    c.rotation.y = (i % 2) * 0.4; scene.add(c);
    colliders.push({ minX: c.position.x - 3.4, maxX: c.position.x + 3.4, minZ: c.position.z - 2, maxZ: c.position.z + 2 });
  }
  for (const cz of [-40, 40]) {
    const crane = new THREE.Group();
    const mast = new THREE.Mesh(new THREE.BoxGeometry(2, 26, 2), mat(0xd7263d));
    mast.position.y = 13; crane.add(mast);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(26, 1.6, 1.6), mat(0xd7263d));
    arm.position.set(6, 26, 0); crane.add(arm);
    crane.position.set(178, 0, cz); scene.add(crane);
  }

  // Palms along the beach and plaza, streetlights along the main roads.
  for (let i = 0; i < 46; i += 1) {
    const x = -190 + rng() * 380;
    const z = rng() < 0.6 ? 168 + rng() * 16 : 138 + rng() * 8;
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 6, 6), mat(0x7a5a3a));
    trunk.position.y = 3; trunk.rotation.z = seededRange(rng, -0.15, 0.15); palm.add(trunk);
    for (let f = 0; f < 5; f += 1) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.5, 4), mat(0x2f8f4e));
      frond.position.set(Math.cos(f * 1.26) * 1.4, 6.4, Math.sin(f * 1.26) * 1.4);
      frond.rotation.set(Math.sin(f * 1.26) * 1.1, 0, Math.cos(f * 1.26) * 1.1);
      palm.add(frond);
    }
    palm.position.set(x, 0, z); scene.add(palm);
  }
  for (const c of [-160, -80, 0, 80, 160]) {
    for (let t = -160; t <= 160; t += 40) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 6), mat(0x444444));
      pole.position.set(c + 6.5, 3.5, t); scene.add(pole);
      const headMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0x000000 });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), headMat);
      head.position.set(c + 6.5, 7.2, t); scene.add(head);
      lamps.push(headMat);
    }
  }

  const markers = {
    garage: { x: -160, z: 100, label: 'GARAGE' },
    policeStation: { x: 40, z: -40, label: 'TBPD HQ' },
    hospital: { x: 0, z: -140, label: 'HOSPITAL' },
    lookout: { x: 0, z: 176, label: 'MARINA LOOKOUT' },
    plaza: { x: plaza.x, z: plaza.z, label: 'MARINA PLAZA' },
    tower: { x: -80, z: -160, label: 'COMMS TOWER' },
    harborDrop: { x: 170, z: 20, label: 'HARBOR DROP' },
    raceBayfront: { x: 0, z: 160, label: 'BAYFRONT SPRINT' },
    raceHarbor: { x: 160, z: 0, label: 'HARBOR LOOP' },
    raceHills: { x: -160, z: -100, label: 'HILLS CLIMB' },
  };
  // Landmark signs: tall glowing pillars so markers read from anywhere.
  for (const key of ['garage', 'policeStation', 'hospital', 'tower']) {
    const m = markers[key];
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 14, 1.4),
      new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: key === 'garage' ? 0xffaa00 : 0x2288ff }),
    );
    pillar.position.set(m.x, 7, m.z); scene.add(pillar);
  }
  return { colliders, roadLines, lamps, markers, plaza };
}

// Circle-vs-building collision: pushes a circle (x, z, radius) out of every
// building AABB it overlaps. Returns the corrected position.
export function resolveBuildingCollision(colliders, x, z, radius) {
  for (const b of colliders) {
    const nx = Math.max(b.minX, Math.min(x, b.maxX));
    const nz = Math.max(b.minZ, Math.min(z, b.maxZ));
    const dx = x - nx, dz = z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        x = nx + (dx / d) * radius;
        z = nz + (dz / d) * radius;
      } else {
        x = b.maxX + radius;
      }
    }
  }
  return { x, z };
}
