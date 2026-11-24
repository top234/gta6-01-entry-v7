// The chase camera: it trails behind Reno on foot and behind the car while
// driving, swings with the mouse, and eases back instead of snapping.
export class ChaseCameraRig {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = 0.42;
    this.distance = 11;
    this.targetYaw = 0;
    this.shake = 0;
  }

  // Mouse drag orbits the camera; the rig slowly re-centres behind the heading.
  addMouse(dx, dy) {
    this.yaw -= dx * 0.005;
    this.pitch = Math.max(0.12, Math.min(1.1, this.pitch + dy * 0.003));
  }

  addShake(amount) {
    this.shake = Math.min(1.2, this.shake + amount);
  }

  update(dt, focus, heading, inCar, speedKmh) {
    const wantDistance = inCar ? 13 + Math.min(4, speedKmh / 40) : 10;
    this.distance += (wantDistance - this.distance) * Math.min(1, dt * 2);
    // Ease the yaw back toward the facing heading when the player is moving.
    let diff = heading - this.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.yaw += diff * Math.min(1, dt * 1.1);
    // The camera trails BEHIND the facing direction: focus minus forward.
    const cx = focus.x - Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance;
    const cz = focus.z - Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance;
    const cy = focus.y + Math.sin(this.pitch) * this.distance + 2.2;
    this.shake = Math.max(0, this.shake - dt * 2.2);
    const shX = (Math.random() - 0.5) * this.shake * 0.5;
    const shY = (Math.random() - 0.5) * this.shake * 0.5;
    this.camera.position.set(cx + shX, cy + shY, cz);
    this.camera.lookAt(focus.x, focus.y + 1.6, focus.z);
  }

  // Snap the camera to a composed framing (used by the screenshot staging).
  snapTo(position, lookAt) {
    this.camera.position.copy(position);
    this.camera.lookAt(lookAt);
    this.yaw = Math.atan2(lookAt.x - position.x, lookAt.z - position.z);
  }
}
