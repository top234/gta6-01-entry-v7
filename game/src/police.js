// The Topaz Bay Police Department: dispatch spawns patrol cars that chase the
// player, sets roadblocks at 3 stars, and sends the VULTURE-1 air unit at 4.
// On foot, a cop who stays close long enough makes the bust.
import { TOPAZ_BAY_CONFIG } from './config.js';
import { buildStreetCar } from './vehicles.js';
import { resolveBuildingCollision } from './city.js';

export class PoliceDispatch {
  constructor(scene, city, rng) {
    this.scene = scene;
    this.city = city;
    this.rng = rng;
    this.cops = [];        // { mesh, heading, speed }
    this.heli = null;      // { group, rotor }
    this.roadblock = null; // { group, x, z }
    this.bustTimer = 0;
    this.roadblockTimer = 0;
    this.dispatchLine = 'TBPD DISPATCH: ALL UNITS, STANDBY.';
    this.flashT = 0;
  }

  get activeCount() { return this.cops.length; }

  wantedCopCount(wanted) {
    return wanted <= 0 ? 0 : Math.min(1 + wanted, 4);
  }

  // Grow or shrink the pursuit to match the wanted level; spawn on roads.
  syncToWanted(wanted, playerPos) {
    const want = this.wantedCopCount(wanted);
    while (this.cops.length < want) {
      const mesh = buildStreetCar(0xf2f2f2, 'cop');
      const road = this.city.roadLines[Math.floor(this.rng() * this.city.roadLines.length)];
      const alongX = this.rng() < 0.5;
      let x = alongX ? playerPos.x + (this.rng() < 0.5 ? -55 : 55) : road;
      let z = alongX ? road : playerPos.z + (this.rng() < 0.5 ? -55 : 55);
      x = Math.max(-190, Math.min(190, x));
      z = Math.max(-190, Math.min(190, z));
      mesh.position.set(x, 0, z);
      this.scene.add(mesh);
      const cop = { mesh, heading: 0, speed: 0, health: 100 };
      mesh.userData.owner = { type: 'cop', ref: cop };
      this.cops.push(cop);
    }
    while (this.cops.length > want) {
      const cop = this.cops.pop();
      this.scene.remove(cop.mesh);
    }
    if (wanted >= 4 && !this.heli) this._spawnHeli(playerPos);
    if (wanted < 4 && this.heli) {
      this.scene.remove(this.heli.group);
      this.heli = null;
    }
    if (wanted >= 3 && !this.roadblock) this._placeRoadblock(playerPos, 0);
    if (wanted < 3 && this.roadblock) {
      this.scene.remove(this.roadblock.group);
      this.roadblock = null;
    }
  }

  _spawnHeli(playerPos) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 5.2), new THREE.MeshLambertMaterial({ color: 0x223344 }));
    group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.1, 2.2), new THREE.MeshLambertMaterial({ color: 0x88ccdd }));
    cabin.position.set(0, 0.2, -1.4); group.add(cabin);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 0.4), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    rotor.position.y = 1.2; group.add(rotor);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4), new THREE.MeshLambertMaterial({ color: 0x223344 }));
    tail.position.set(0, 0.3, 4.2); group.add(tail);
    const spot = new THREE.Mesh(
      new THREE.ConeGeometry(6, 26, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff6b0, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
    );
    spot.position.y = -13; spot.rotation.x = Math.PI; group.add(spot);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshLambertMaterial({ color: 0xfff6b0, emissive: 0xaaaa00 }));
    lamp.position.set(0, -0.9, -1.5); group.add(lamp);
    group.position.set(playerPos.x, 30, playerPos.z);
    this.scene.add(group);
    this.heli = { group, rotor };
    this.dispatchLine = 'TBPD DISPATCH: VULTURE-1 AIRBORNE — EYES ON SUSPECT.';
  }

  _placeRoadblock(playerPos, heading) {
    const group = new THREE.Group();
    for (const sx of [-4, 4]) {
      const car = buildStreetCar(0xf2f2f2, 'cop');
      car.position.set(sx, 0, 0);
      car.rotation.y = Math.PI / 2;
      group.add(car);
    }
    for (const sx of [-8, 0, 8]) {
      const barrier = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 1.1, 0.5),
        new THREE.MeshLambertMaterial({ color: 0xff8800, emissive: 0x331100 }),
      );
      barrier.position.set(sx, 0.55, 3);
      group.add(barrier);
    }
    const x = playerPos.x + Math.sin(heading) * 45;
    const z = playerPos.z + Math.cos(heading) * 45;
    group.position.set(Math.max(-185, Math.min(185, x)), 0, Math.max(-185, Math.min(185, z)));
    group.rotation.y = heading;
    this.scene.add(group);
    this.roadblock = { group, x: group.position.x, z: group.position.z };
    this.dispatchLine = 'TBPD DISPATCH: ROADBLOCK AHEAD — ALL UNITS CONVERGE.';
  }

  // Chase the player; returns 'busted' when the bust timer completes on foot.
  update(dt, wanted, playerPos, playerInCar, playerHeading, onRam) {
    this.flashT += dt;
    const flash = Math.sin(this.flashT * 14) > 0;
    for (const cop of this.cops) {
      const red = cop.mesh.userData.sirenRed;
      const blue = cop.mesh.userData.sirenBlue;
      if (red && blue) {
        red.material.emissiveIntensity = flash ? 2.2 : 0.2;
        blue.material.emissiveIntensity = flash ? 0.2 : 2.2;
      }
      const dx = playerPos.x - cop.mesh.position.x;
      const dz = playerPos.z - cop.mesh.position.z;
      const dist = Math.hypot(dx, dz) || 1;
      const targetHeading = Math.atan2(dx, dz);
      let diff = targetHeading - cop.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      cop.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      cop.speed = Math.min(TOPAZ_BAY_CONFIG.copTopSpeed, cop.speed + 22 * dt);
      if (dist < 4) cop.speed = Math.min(cop.speed, 6);
      const nx = cop.mesh.position.x + Math.sin(cop.heading) * cop.speed * dt;
      const nz = cop.mesh.position.z + Math.cos(cop.heading) * cop.speed * dt;
      const fixed = resolveBuildingCollision(this.city.colliders, nx, nz, 1.9);
      cop.mesh.position.x = Math.max(-198, Math.min(198, fixed.x));
      cop.mesh.position.z = Math.max(-198, Math.min(198, fixed.z));
      cop.mesh.rotation.y = cop.heading + Math.PI;
      if (dist < 3.6 && playerInCar && onRam) onRam(6 * dt);
    }
    if (this.heli) {
      const h = this.heli.group.position;
      h.x += (playerPos.x - h.x) * Math.min(1, dt * 1.4);
      h.z += (playerPos.z - h.z) * Math.min(1, dt * 1.4);
      h.y = 30 + Math.sin(this.flashT * 0.8) * 1.5;
      this.heli.rotor.rotation.y += dt * 30;
      this.heli.group.rotation.y = Math.atan2(playerPos.x - h.x, playerPos.z - h.z);
    }
    if (this.roadblock && wanted >= 3) {
      this.roadblockTimer += dt;
      if (this.roadblockTimer > 18) {
        this.roadblockTimer = 0;
        this.scene.remove(this.roadblock.group);
        this.roadblock = null;
        this._placeRoadblock(playerPos, playerHeading);
      }
    }
    // Bust: on foot, a patrol car parked on top of the player for 3 seconds.
    if (!playerInCar && wanted > 0) {
      const near = this.cops.some((cop) => {
        const dx = cop.mesh.position.x - playerPos.x;
        const dz = cop.mesh.position.z - playerPos.z;
        return dx * dx + dz * dz < 30;
      });
      this.bustTimer = near ? this.bustTimer + dt : Math.max(0, this.bustTimer - dt * 2);
      if (this.bustTimer >= 3) {
        this.bustTimer = 0;
        return 'busted';
      }
    } else {
      this.bustTimer = Math.max(0, this.bustTimer - dt);
    }
    return null;
  }

  clearAll() {
    for (const cop of this.cops) this.scene.remove(cop.mesh);
    this.cops = [];
    if (this.heli) { this.scene.remove(this.heli.group); this.heli = null; }
    if (this.roadblock) { this.scene.remove(this.roadblock.group); this.roadblock = null; }
    this.dispatchLine = 'TBPD DISPATCH: ALL UNITS, STANDBY.';
  }
}
