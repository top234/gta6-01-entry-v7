// The Topaz Bay HUD: a 240px live minimap, five big wanted stars, a bold
// objective banner, speed, weapon, crew and radio chips — everything sized to
// stay readable when the screenshot shrinks to a quarter of its size.
import { TOPAZ_BAY_DISTRICTS, districtAt } from './config.js';

export class TopazBayHud {
  constructor(state, city) {
    this.state = state;
    this.city = city;
    this.el = {};
    for (const id of ['hud', 'minimap', 'minimap-district', 'minimap-clock', 'wanted', 'money',
      'health-fill', 'armor-fill', 'objective-banner', 'speed-value', 'weapon-name', 'crew-chips',
      'radio-station', 'radio-song', 'dispatch-line', 'prompt', 'crosshair', 'banner-center',
      'damage-vignette', 'bust-meter']) {
      this.el[id] = document.getElementById(id);
    }
    this.mapCtx = this.el.minimap.getContext('2d');
    this.bannerUntil = 0;
    this.objective = 'PRESS M TO START MISSION 1';
  }

  show() { this.el.hud.classList.remove('hidden'); }
  hide() { this.el.hud.classList.add('hidden'); }

  setObjective(text) {
    this.objective = text;
    this.el['objective-banner'].textContent = text;
  }

  setBanner(text, ms = 3600) {
    const b = this.el['banner-center'];
    b.textContent = text;
    b.classList.remove('hidden');
    this.bannerUntil = performance.now() + ms;
  }

  setPrompt(text) {
    const p = this.el.prompt;
    if (text) { p.textContent = text; p.classList.remove('hidden'); }
    else p.classList.add('hidden');
  }

  update(ctx, dt) {
    const s = this.state;
    if (performance.now() > this.bannerUntil) this.el['banner-center'].classList.add('hidden');
    // Wanted stars: filled gold for the heat, dim outlines for the rest.
    let stars = '';
    for (let i = 0; i < 5; i += 1) {
      stars += i < s.wanted ? '★' : '<span class="off">☆</span>';
    }
    this.el.wanted.innerHTML = stars;
    this.el.money.textContent = `$${s.money.toLocaleString('en-US')}`;
    this.el['health-fill'].style.width = `${Math.max(0, s.health)}%`;
    this.el['health-fill'].style.background = s.health > 50 ? '#2fbf71' : s.health > 25 ? '#f4d35e' : '#d7263d';
    this.el['armor-fill'].style.width = `${Math.max(0, s.armor)}%`;
    const pos = ctx.playerPos();
    const district = districtAt(pos.x, pos.z);
    this.el['minimap-district'].textContent = district.name;
    this.el['minimap-clock'].textContent = ctx.daynight.clockLabel(s.timeOfDay);
    this.el['speed-value'].textContent = ctx.driving.car ? ctx.driving.speedKmh : Math.round(ctx.onFootSpeed * 3.6);
    this.el['weapon-name'].textContent = ctx.weapons.current.name;
    this.el['weapon-name'].style.color = ctx.weapons.current.color;
    this.el['radio-station'].textContent = s.radioOn ? ctx.radio.current.name : 'RADIO OFF';
    this.el['radio-song'].textContent = s.radioOn ? `♪ ${ctx.radio.currentSong}` : 'PRESS R FOR RADIO';
    this.el['dispatch-line'].textContent = ctx.police.dispatchLine;
    // Crew chips with live cooldowns.
    const chips = Object.entries(s.crew).map(([id, member]) => {
      const ability = ctx.crewAbilities[id];
      const cd = member.cooldown > 0 ? ` <span class="cd">${Math.ceil(member.cooldown)}s</span>` : ' <span class="cd">READY</span>';
      const lock = member.unlocked ? '' : ' 🔒';
      return `<div class="crew-chip panel">${ability.key} ${member.name.split(' ')[0]} — ${ability.name}${member.unlocked ? cd : lock}</div>`;
    }).join('');
    if (this._lastChips !== chips) { this.el['crew-chips'].innerHTML = chips; this._lastChips = chips; }
    this.el.crosshair.classList.toggle('hidden', !!ctx.driving.car || s.weaponIndex === 0 || ctx.mode !== 'playing');
    const bust = ctx.police.bustTimer;
    this.el['bust-meter'].classList.toggle('hidden', bust <= 0.2);
    if (bust > 0.2) this.el['bust-meter'].textContent = `BUSTED IN ${Math.ceil(3 - bust)} — RUN!`;
    this.el['damage-vignette'].style.opacity = String(Math.min(1, (ctx.damageFlash || 0) * 1.4));
    this._drawMinimap(ctx, pos);
  }

  _drawMinimap(ctx, pos) {
    const c = this.mapCtx;
    const S = 240, scale = S / 400;
    const X = (x) => (x + 200) * scale;
    const Z = (z) => (z + 200) * scale;
    c.fillStyle = '#1f8fb2'; c.fillRect(0, 0, S, S); // sea base
    c.fillStyle = '#8fae72'; c.fillRect(0, 0, S, S * 0.96);
    c.fillStyle = '#e8d29a'; c.fillRect(0, S * 0.92, S, S * 0.08); // beach
    for (const d of TOPAZ_BAY_DISTRICTS) {
      const [x0, x1, z0, z1] = d.bounds;
      c.fillStyle = `#${d.tint.toString(16).padStart(6, '0')}55`;
      c.fillRect(X(x0), Z(z0), (x1 - x0) * scale, (z1 - z0) * scale);
    }
    // Roads.
    c.strokeStyle = '#3a3f44'; c.lineWidth = 4;
    for (const line of this.city.roadLines) {
      c.beginPath(); c.moveTo(X(line), 0); c.lineTo(X(line), S); c.stroke();
      c.beginPath(); c.moveTo(0, Z(line)); c.lineTo(S, Z(line)); c.stroke();
    }
    // Landmarks: garage, hospital, police HQ.
    const marks = [
      [this.city.markers.garage, '#ffaa00', 'G'],
      [this.city.markers.hospital, '#ffffff', 'H'],
      [this.city.markers.policeStation, '#4aa8ff', 'P'],
    ];
    for (const [m, color, label] of marks) {
      c.fillStyle = color;
      c.fillRect(X(m.x) - 6, Z(m.z) - 6, 12, 12);
      c.fillStyle = '#000';
      c.font = 'bold 10px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(label, X(m.x), Z(m.z));
    }
    // Mission marker: big pulsing yellow diamond.
    if (ctx.missionMarker) {
      const mx = X(ctx.missionMarker.x), mz = Z(ctx.missionMarker.z);
      const pulse = 9 + Math.sin(performance.now() / 200) * 2.5;
      c.fillStyle = '#ffd23f';
      c.beginPath();
      c.moveTo(mx, mz - pulse); c.lineTo(mx + pulse, mz); c.lineTo(mx, mz + pulse); c.lineTo(mx - pulse, mz);
      c.closePath(); c.fill();
      c.strokeStyle = '#000'; c.lineWidth = 2; c.stroke();
    }
    // Cops as blue dots, the heli as a red dot, the player as a white arrow.
    for (const cop of ctx.police.cops) {
      c.fillStyle = '#2266ff';
      c.beginPath(); c.arc(X(cop.mesh.position.x), Z(cop.mesh.position.z), 4.5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke();
    }
    if (ctx.police.heli) {
      c.fillStyle = '#ff2222';
      c.beginPath(); c.arc(X(ctx.police.heli.group.position.x), Z(ctx.police.heli.group.position.z), 5, 0, Math.PI * 2); c.fill();
    }
    const heading = ctx.playerHeading();
    c.save();
    c.translate(X(pos.x), Z(pos.z));
    c.rotate(Math.PI - heading);
    c.fillStyle = '#ffffff';
    c.beginPath(); c.moveTo(0, -9); c.lineTo(6, 7); c.lineTo(-6, 7); c.closePath(); c.fill();
    c.strokeStyle = '#000'; c.lineWidth = 2; c.stroke();
    c.restore();
    // View cone: a faint wedge showing where the camera looks.
    c.save();
    c.translate(X(pos.x), Z(pos.z));
    c.rotate(Math.PI - heading);
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-16, -30); c.lineTo(16, -30); c.closePath(); c.fill();
    c.restore();
  }
}
