// Fire, smoke, sparks and explosions for Topaz Bay: lightweight particle
// bursts built from plain meshes — no textures, no files, all procedural.
const liveBursts = [];

export function spawnCarExplosion(scene, pos) {
  const group = new THREE.Group();
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffdd33, transparent: true, opacity: 0.95 }),
  );
  group.add(flash);
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(1.8, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.95 }),
  );
  group.add(core);
  const parts = [];
  for (let i = 0; i < 26; i += 1) {
    const p = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshBasicMaterial({ color: [0xffdd33, 0xff8800, 0x333333][i % 3] }),
    );
    p.position.set(0, 0.5, 0);
    const a = Math.random() * Math.PI * 2;
    const up = 4 + Math.random() * 9;
    p.userData.vel = new THREE.Vector3(Math.cos(a) * (3 + Math.random() * 7), up, Math.sin(a) * (3 + Math.random() * 7));
    group.add(p);
    parts.push(p);
  }
  group.position.copy(pos);
  group.position.y = 1;
  scene.add(group);
  liveBursts.push({ group, parts, flash, core, life: 0, maxLife: 1.6 });
}

export function spawnImpactSparks(scene, point) {
  const group = new THREE.Group();
  for (let i = 0; i < 6; i += 1) {
    const p = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, 0.16),
      new THREE.MeshBasicMaterial({ color: 0xffee88 }),
    );
    const a = Math.random() * Math.PI * 2;
    p.userData.vel = new THREE.Vector3(Math.cos(a) * 4, 2 + Math.random() * 4, Math.sin(a) * 4);
    group.add(p);
  }
  group.position.copy(point);
  scene.add(group);
  liveBursts.push({ group, parts: group.children, flash: null, core: null, life: 0, maxLife: 0.4 });
}

export function spawnCarSmoke(scene, carMesh) {
  const puff = new THREE.Mesh(
    new THREE.SphereGeometry(0.7 + Math.random() * 0.5, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.55 }),
  );
  puff.position.copy(carMesh.position);
  puff.position.y = 1.6;
  puff.userData.vel = new THREE.Vector3(0, 2.2, 0);
  scene.add(puff);
  liveBursts.push({ group: puff, parts: [puff], flash: null, core: null, life: 0, maxLife: 1.1, solo: true });
}

export function spawnCarFire(scene, carMesh) {
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.8, 2.2, 8),
    new THREE.MeshBasicMaterial({ color: 0xff7722, transparent: true, opacity: 0.9 }),
  );
  flame.position.copy(carMesh.position);
  flame.position.y = 1.8;
  scene.add(flame);
  liveBursts.push({ group: flame, parts: [], flash: flame, core: null, life: 0, maxLife: 0.5, solo: true });
}

// Step every live burst; expired ones are removed from the scene.
export function updateEffects(scene, dt) {
  for (let i = liveBursts.length - 1; i >= 0; i -= 1) {
    const b = liveBursts[i];
    b.life += dt;
    const k = b.life / b.maxLife;
    if (b.flash && !b.solo) {
      b.flash.scale.setScalar(1 + k * 2.2);
      b.flash.material.opacity = Math.max(0, 0.95 - k);
    }
    if (b.core) {
      b.core.scale.setScalar(1 + k * 1.4);
      b.core.material.opacity = Math.max(0, 0.95 - k * 1.2);
    }
    for (const p of b.parts) {
      if (!p.userData.vel) continue;
      p.position.addScaledVector(p.userData.vel, dt);
      p.userData.vel.y -= 14 * dt;
      if (p.material.transparent) p.material.opacity = Math.max(0, 0.6 - k * 0.6);
    }
    if (b.life >= b.maxLife) {
      scene.remove(b.group);
      liveBursts.splice(i, 1);
    }
  }
}
