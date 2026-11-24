// Reno Arka, the player on foot: a low-poly figure who walks, runs, turns
// toward the camera's facing and steps in and out of cars.
import { TOPAZ_BAY_CONFIG } from './config.js';
import { buildPedestrianMesh } from './pedestrians.js';
import { resolveBuildingCollision } from './city.js';

export class PlayerOnFoot {
  constructor(scene) {
    // Reno: white tee, dark jeans, tan skin, red cap — readable at any zoom.
    this.mesh = buildPedestrianMesh(0xffffff, 0x2e4057, 0xe0ac69);
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 8, 0, Math.PI * 2, 0, 1.1),
      new THREE.MeshLambertMaterial({ color: 0xd7263d }),
    );
    cap.position.y = 1.95; this.mesh.add(cap);
    this.mesh.scale.setScalar(1.15);
    scene.add(this.mesh);
    this.x = 0; this.z = 120;
    this.heading = 0;
    this.moving = false;
    this.mesh.position.set(this.x, 0, this.z);
  }

  get position() { return { x: this.x, z: this.z }; }

  setPosition(x, z) {
    this.x = x; this.z = z;
    this.mesh.position.set(x, 0, z);
  }

  // WASD moves relative to the camera yaw; Shift runs. Returns distance moved.
  update(dt, input, cameraYaw, colliders) {
    let mx = 0, mz = 0;
    if (input.down('KeyW')) mz -= 1;
    if (input.down('KeyS')) mz += 1;
    if (input.down('KeyA')) mx -= 1;
    if (input.down('KeyD')) mx += 1;
    this.moving = mx !== 0 || mz !== 0;
    if (!this.moving) return 0;
    const len = Math.hypot(mx, mz); mx /= len; mz /= len;
    const sin = Math.sin(cameraYaw), cos = Math.cos(cameraYaw);
    const wx = mx * cos - mz * sin;
    const wz = mx * sin + mz * cos;
    const speed = input.down('ShiftLeft') || input.down('ShiftRight')
      ? TOPAZ_BAY_CONFIG.runSpeed : TOPAZ_BAY_CONFIG.walkSpeed;
    const nx = this.x + wx * speed * dt;
    const nz = this.z + wz * speed * dt;
    const fixed = resolveBuildingCollision(colliders, nx, nz, 0.8);
    this.x = Math.max(-198, Math.min(198, fixed.x));
    this.z = Math.max(-198, Math.min(198, fixed.z));
    this.heading = Math.atan2(wx, wz);
    this.mesh.rotation.y = this.heading;
    this.mesh.position.set(this.x, Math.abs(Math.sin(performance.now() / 140)) * 0.08, this.z);
    return speed * dt;
  }
}
