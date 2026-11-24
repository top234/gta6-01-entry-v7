// Topaz Bay's day and night: a slow sun arc over the coast, warm at noon,
// gold at dusk, deep blue after dark — with streetlights that switch on.
import { TOPAZ_BAY_CONFIG } from './config.js';

export class DayNightCycle {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.sun = new THREE.DirectionalLight(0xfff2d0, 1.15);
    this.sun.position.set(120, 180, 60);
    scene.add(this.sun);
    this.hemi = new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, 0.85);
    scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(this.ambient);
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x9fd4e8, 220, 520);
  }

  // Advance the clock; dt is real seconds, dayLengthSeconds is one full day.
  update(dt, state) {
    state.timeOfDay = (state.timeOfDay + (dt / TOPAZ_BAY_CONFIG.dayLengthSeconds) * 24) % 24;
    this.apply(state.timeOfDay);
  }

  apply(hour) {
    const sunAngle = ((hour - 6) / 12) * Math.PI; // 06:00 sunrise, 18:00 sunset
    const elevation = Math.sin(sunAngle);
    const dayFactor = Math.max(0, Math.min(1, elevation * 2.2 + 0.25));
    const duskFactor = Math.max(0, 1 - Math.abs(elevation) * 3) * (hour > 12 ? 1 : 0.4);
    this.sun.position.set(Math.cos(sunAngle) * 220, Math.max(12, elevation * 220), 80);
    this.sun.intensity = 0.25 + dayFactor * 0.95;
    this.sun.color.setHSL(0.1 + duskFactor * 0.02, 0.55 + duskFactor * 0.3, 0.72 - duskFactor * 0.12);
    this.hemi.intensity = 0.3 + dayFactor * 0.6;
    this.ambient.intensity = 0.12 + dayFactor * 0.16;
    const sky = new THREE.Color(0x0b1e3a).lerp(new THREE.Color(0x87ceeb), dayFactor);
    if (duskFactor > 0.05) sky.lerp(new THREE.Color(0xff9a5c), duskFactor * 0.55);
    this.scene.background = sky;
    this.scene.fog.color.copy(sky);
    const lampsOn = dayFactor < 0.45;
    for (const lamp of this.city.lamps) lamp.emissive.setHex(lampsOn ? 0xffdf66 : 0x000000);
  }

  clockLabel(hour) {
    const h = Math.floor(hour) % 24;
    const m = Math.round((hour % 1) * 60) % 60; // round: 10.2 must read 10:12, not 10:11
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
