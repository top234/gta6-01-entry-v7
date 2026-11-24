// Arcade driving for Topaz Bay: acceleration, braking, reverse, steering that
// tightens with speed, building and car collisions, and damage that ends in
// smoke, fire and an explosion.
import { TOPAZ_BAY_CONFIG } from './config.js';
import { resolveBuildingCollision } from './city.js';

export class DrivingController {
  constructor() {
    this.car = null;       // traffic car object currently driven
    this.speed = 0;        // signed units/second, forward positive
    this.heading = 0;
    this.engineLevel = 0;  // garage upgrades: 0-3
    this.armorLevel = 0;
  }

  get topSpeed() {
    return TOPAZ_BAY_CONFIG.carTopSpeed * (1 + this.engineLevel * 0.14);
  }

  enterCar(car, playerHeading) {
    this.car = car;
    car.occupied = true;
    this.speed = 0;
    // Take the player's facing so the car never snaps sideways on entry.
    this.heading = playerHeading;
    return car;
  }

  exitCar() {
    if (!this.car) return null;
    const car = this.car;
    car.occupied = false;
    this.car = null;
    this.speed = 0;
    return car;
  }

  // W/S accelerate and brake/reverse, A/D steer. Returns distance driven.
  update(dt, input, colliders, otherCars, onCrash) {
    if (!this.car) return 0;
    const top = this.topSpeed;
    if (input.down('KeyW')) this.speed += 26 * dt;
    else if (input.down('KeyS')) this.speed -= this.speed > 0.5 ? 34 * dt : 12 * dt;
    else this.speed *= Math.max(0, 1 - 0.6 * dt);
    this.speed = Math.max(-12, Math.min(top, this.speed));
    const steer = (input.down('KeyA') ? 1 : 0) - (input.down('KeyD') ? 1 : 0);
    const steerAuthority = Math.min(1, Math.abs(this.speed) / 8);
    this.heading += steer * 1.9 * steerAuthority * dt * Math.sign(this.speed || 1);
    const nx = this.car.mesh.position.x + Math.sin(this.heading) * this.speed * dt;
    const nz = this.car.mesh.position.z + Math.cos(this.heading) * this.speed * dt;
    const before = { x: this.car.mesh.position.x, z: this.car.mesh.position.z };
    const fixed = resolveBuildingCollision(colliders, nx, nz, 1.9);
    const hitWall = Math.abs(fixed.x - nx) > 0.01 || Math.abs(fixed.z - nz) > 0.01;
    this.car.mesh.position.x = Math.max(-198, Math.min(198, fixed.x));
    this.car.mesh.position.z = Math.max(-198, Math.min(198, fixed.z));
    this.car.mesh.rotation.y = this.heading + Math.PI;
    if (hitWall && Math.abs(this.speed) > 8) {
      this.damage(Math.abs(this.speed) * 1.2, onCrash);
      this.speed *= -0.25;
    }
    // Soft collisions with other cars: both slow down, both take damage.
    for (const other of otherCars) {
      if (other === this.car || other.occupied) continue;
      const dx = other.mesh.position.x - this.car.mesh.position.x;
      const dz = other.mesh.position.z - this.car.mesh.position.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < 12 && Math.abs(this.speed) > 4) {
        this.damage(8, onCrash);
        other.health -= 12;
        this.speed *= 0.55;
      }
    }
    const moved = Math.hypot(
      this.car.mesh.position.x - before.x, this.car.mesh.position.z - before.z,
    );
    return moved;
  }

  damage(amount, onCrash) {
    if (!this.car) return;
    const mitigated = amount * (1 - this.armorLevel * 0.2);
    this.car.health -= mitigated;
    if (onCrash) onCrash(this.car.health);
  }

  get speedKmh() { return Math.round(Math.abs(this.speed) * 3.6); }
  get position() {
    if (!this.car) return null;
    return { x: this.car.mesh.position.x, z: this.car.mesh.position.z };
  }
}
