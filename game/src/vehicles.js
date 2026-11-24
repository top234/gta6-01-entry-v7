// Cars of Topaz Bay: a boxy low-poly factory (sedan, taxi, truck, cop car,
// sports car) plus the traffic system that drives them along the grid roads.
import { TOPAZ_BAY_CONFIG, TOPAZ_BAY_PALETTE } from './config.js';
import { seededPick } from './random.js';

export function buildStreetCar(color, kind = 'sedan') {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a2530 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.85, kind === 'truck' ? 5.6 : 4.4), bodyMat);
  body.position.y = 0.75; group.add(body);
  if (kind === 'truck') {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 2.6), new THREE.MeshLambertMaterial({ color: 0x8a8a8a }));
    bed.position.set(0, 1.2, 1.2); group.add(bed);
  }
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.75, kind === 'sports' ? 1.9 : 2.2), darkMat);
  cabin.position.set(0, 1.5, kind === 'truck' ? -1.4 : -0.2); group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheelZ = kind === 'truck' ? 1.9 : 1.45;
  for (const [wx, wz] of [[-1.0, wheelZ], [1.0, wheelZ], [-1.0, -wheelZ], [1.0, -wheelZ]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(wx, 0.42, wz); group.add(wheel);
  }
  // Headlights and taillights so cars read at dusk and in the minimap's glare.
  const headMat = new THREE.MeshLambertMaterial({ color: 0xfff8c0, emissive: 0x555533 });
  for (const sx of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.1), headMat);
    h.position.set(sx, 0.8, kind === 'truck' ? -2.85 : -2.25); group.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.1), new THREE.MeshLambertMaterial({ color: 0xcc2222, emissive: 0x550000 }));
    t.position.set(sx, 0.8, kind === 'truck' ? 2.85 : 2.25); group.add(t);
  }
  if (kind === 'cop') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 0.5), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x333333 }));
    bar.position.set(0, 1.98, -0.2); group.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.24, 0.5), new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xaa0000 }));
    red.position.set(-0.4, 2.0, -0.2); group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.24, 0.5), new THREE.MeshLambertMaterial({ color: 0x2266ff, emissive: 0x0022aa }));
    blue.position.set(0.4, 2.0, -0.2); group.add(blue);
    group.userData.sirenRed = red; group.userData.sirenBlue = blue;
  }
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.4), new THREE.MeshLambertMaterial({ color: 0xffe600, emissive: 0x665500 }));
    sign.position.set(0, 2.0, -0.2); group.add(sign);
  }
  group.userData.kind = kind;
  return group;
}

// Traffic: cars cruise the grid, turn at intersections, and stop briefly when
// the player blocks the road ahead. Returns { cars, update, nearestCar }.
export function createTrafficSystem(scene, city, rng, count = 16) {
  const cars = [];
  const kinds = ['sedan', 'sedan', 'sedan', 'taxi', 'truck', 'sports'];
  for (let i = 0; i < count; i += 1) {
    const kind = seededPick(rng, kinds);
    const color = kind === 'taxi' ? 0xf4d35e : seededPick(rng, TOPAZ_BAY_PALETTE.car);
    const mesh = buildStreetCar(color, kind);
    const alongX = rng() < 0.5;
    const lane = city.roadLines[Math.floor(rng() * city.roadLines.length)];
    const t = -180 + rng() * 360;
    const car = {
      mesh, kind, color, alongX, lane, t,
      dir: rng() < 0.5 ? 1 : -1, speed: 9 + rng() * 5,
      occupied: false, stolen: false, health: 100, burning: 0,
    };
    mesh.position.set(alongX ? t : lane, 0, alongX ? lane : t);
    // The car model faces -z at rotation 0: +x needs -PI/2, +z needs PI.
    mesh.rotation.y = alongX ? (car.dir > 0 ? -Math.PI / 2 : Math.PI / 2) : (car.dir > 0 ? Math.PI : 0);
    scene.add(mesh);
    cars.push(car);
  }

  function update(dt, playerPos, playerCar) {
    for (const car of cars) {
      if (car.occupied || car.wrecked) continue; // driven by the player, or a burnt wreck
      // Slow down if the player (on foot or in a car) is right ahead.
      let blocked = false;
      const aheadX = car.mesh.position.x + Math.sin(car.mesh.rotation.y) * -6;
      const aheadZ = car.mesh.position.z + Math.cos(car.mesh.rotation.y) * -6;
      if (playerPos) {
        const dx = playerPos.x - aheadX, dz = playerPos.z - aheadZ;
        if (dx * dx + dz * dz < 36) blocked = true;
      }
      const v = blocked ? 0 : car.speed;
      car.t += car.dir * v * dt;
      if (car.t > 190 || car.t < -190) {
        // Turn onto a cross street at the city edge instead of leaving town.
        car.dir *= -1;
        car.alongX = !car.alongX;
        car.lane = city.roadLines[Math.floor(rng() * city.roadLines.length)];
        car.t = Math.max(-180, Math.min(180, car.t));
      }
      car.mesh.position.set(car.alongX ? car.t : car.lane, 0, car.alongX ? car.lane : car.t);
      car.mesh.rotation.y = car.alongX
        ? (car.dir > 0 ? -Math.PI / 2 : Math.PI / 2)
        : (car.dir > 0 ? Math.PI : 0);
      if (playerCar && car !== playerCar) {
        const dx = car.mesh.position.x - playerCar.mesh.position.x;
        const dz = car.mesh.position.z - playerCar.mesh.position.z;
        if (dx * dx + dz * dz < 16 && playerCar.speed > 6) {
          car.health -= 25; // rammed by the player
        }
      }
    }
  }

  function nearestCar(x, z, maxDist) {
    let best = null, bestD = maxDist * maxDist;
    for (const car of cars) {
      if (car.occupied || car.wrecked) continue;
      const dx = car.mesh.position.x - x, dz = car.mesh.position.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD) { best = car; bestD = d2; }
    }
    return best;
  }

  return { cars, update, nearestCar };
}
