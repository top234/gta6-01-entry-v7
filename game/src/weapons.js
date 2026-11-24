// Reno's arsenal: fists, a Harbor Pistol, a Street SMG and a Bay Shotgun,
// picked from a radial weapon wheel (Q) and fired with the mouse. Shots are
// real raycasts: they drop pedestrians, damage cars and can blow them up.
import { spawnImpactSparks } from './effects.js';

export const TOPAZ_BAY_WEAPONS = [
  { name: 'FISTS', short: 'FISTS', damage: 0, rate: 0.4, range: 3, pellets: 1, spread: 0, color: '#e8d29a' },
  { name: 'HARBOR PISTOL', short: 'PISTOL', damage: 34, rate: 0.32, range: 70, pellets: 1, spread: 0.01, color: '#7fd4c1' },
  { name: 'STREET SMG', short: 'SMG', damage: 16, rate: 0.09, range: 55, pellets: 1, spread: 0.05, color: '#f4d35e' },
  { name: 'BAY SHOTGUN', short: 'SHOTGUN', damage: 12, rate: 0.9, range: 32, pellets: 6, spread: 0.12, color: '#ee964b' },
];

export class WeaponWheelArsenal {
  constructor(state) {
    this.state = state;
    this.cooldown = 0;
    this.wheelOpen = false;
    this.raycaster = new THREE.Raycaster();
    this.center = new THREE.Vector2(0, 0);
    this.muzzleFlash = 0;
  }

  get current() { return TOPAZ_BAY_WEAPONS[this.state.weaponIndex]; }

  toggleWheel() {
    this.wheelOpen = !this.wheelOpen;
    document.getElementById('weapon-wheel').classList.toggle('open', this.wheelOpen);
    if (this.wheelOpen) this.renderWheel();
  }

  setWheelOpen(open) {
    this.wheelOpen = open;
    document.getElementById('weapon-wheel').classList.toggle('open', open);
    if (open) this.renderWheel();
  }

  renderWheel() {
    const wheel = document.getElementById('weapon-wheel');
    wheel.querySelectorAll('.wheel-slot').forEach((slot, i) => {
      slot.classList.toggle('selected', i === this.state.weaponIndex);
    });
  }

  select(index) {
    if (index >= 0 && index < TOPAZ_BAY_WEAPONS.length) {
      this.state.weaponIndex = index;
      this.renderWheel();
    }
  }

  cycle(dir) {
    this.select((this.state.weaponIndex + dir + TOPAZ_BAY_WEAPONS.length) % TOPAZ_BAY_WEAPONS.length);
  }

  // Fire from the camera through the crosshair. onHit receives (kind, ref).
  fire(ctx) {
    if (this.cooldown > 0) return false;
    const weapon = this.current;
    this.cooldown = weapon.rate;
    this.muzzleFlash = 0.06;
    this.state.stats.shotsFired += 1;
    if (weapon.damage === 0) {
      // Fists: knock down a pedestrian at arm's reach.
      const ped = ctx.peds.nearestPed(ctx.player.x, ctx.player.z, 3);
      if (ped) ctx.peds.knockDown(ped.x, ped.z, 2);
      return true;
    }
    const targets = [];
    for (const car of ctx.traffic.cars) targets.push(car.mesh);
    for (const cop of ctx.police.cops) targets.push(cop.mesh);
    for (const ped of ctx.peds.peds) if (!ped.down) targets.push(ped.mesh);
    for (const t of ctx.missionTargets) if (t.alive) targets.push(t.mesh);
    if (ctx.driving.car) targets.push(ctx.driving.car.mesh);
    let hitAnything = false;
    for (let p = 0; p < weapon.pellets; p += 1) {
      this.center.set((Math.random() - 0.5) * weapon.spread * 4, (Math.random() - 0.5) * weapon.spread * 4);
      this.raycaster.setFromCamera(this.center, ctx.camera);
      this.raycaster.far = weapon.range;
      const hits = this.raycaster.intersectObjects(targets, true);
      if (hits.length === 0) continue;
      hitAnything = true;
      const hit = hits[0];
      spawnImpactSparks(ctx.scene, hit.point);
      let node = hit.object;
      while (node && !node.userData.owner) node = node.parent;
      if (node && node.userData.owner) {
        const owner = node.userData.owner;
        if (owner.type === 'ped') ctx.peds.knockDown(owner.ref.x, owner.ref.z, 1.5);
        if (owner.type === 'car') owner.ref.health -= weapon.damage;
        if (owner.type === 'cop') owner.ref.health = (owner.ref.health ?? 100) - weapon.damage;
        if (owner.type === 'lookout') { owner.ref.alive = false; owner.ref.mesh.visible = false; }
        if (ctx.onWeaponHit) ctx.onWeaponHit(owner.type, owner.ref);
      }
      break; // one pellet hit is enough per trigger pull for the tracer
    }
    if (!hitAnything) {
      // Tracer into the distance so a miss still reads as a shot.
      const end = new THREE.Vector3();
      this.raycaster.ray.at(weapon.range, end);
      spawnImpactSparks(ctx.scene, end);
    }
    return true;
  }

  update(dt) {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.muzzleFlash > 0) this.muzzleFlash -= dt;
  }
}
