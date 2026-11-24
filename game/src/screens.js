// Every menu of Topaz Bay: the title screen with its feature strip and save
// slots, pause, the big readable status screen, mission briefings, the garage
// shop, and the busted and wasted screens.
import { STORY_MISSIONS } from './missions.js';
import { STREET_RACES } from './races.js';
import { GARAGE_UPGRADES } from './garage.js';
import { TOPAZ_BAY_CREW_ABILITIES } from './crew.js';
import { TOPAZ_BAY_DISTRICTS } from './config.js';
import { listTopazBaySaveSlots } from './save.js';

export class MenuScreens {
  constructor(callbacks) {
    this.cb = callbacks;
    this.ids = ['title-screen', 'pause-screen', 'status-screen', 'briefing-screen',
      'garage-screen', 'mission-end-screen', 'busted-screen', 'wasted-screen'];
    this._wire();
  }

  _show(id) {
    for (const other of this.ids) {
      document.getElementById(other).classList.toggle('hidden', other !== id);
    }
  }

  hideAll() {
    for (const id of this.ids) document.getElementById(id).classList.add('hidden');
  }

  _wire() {
    document.getElementById('start-btn').addEventListener('click', () => this.cb.onStart(null));
    document.getElementById('resume-btn').addEventListener('click', () => this.cb.onResume());
    document.getElementById('status-btn').addEventListener('click', () => this.cb.onStatus());
    document.getElementById('save-btn').addEventListener('click', () => this.cb.onSave());
    document.getElementById('quit-btn').addEventListener('click', () => this.cb.onQuit());
    document.getElementById('status-close').addEventListener('click', () => this.cb.onStatusClose());
    document.getElementById('briefing-start').addEventListener('click', () => this.cb.onBriefingStart());
    document.getElementById('garage-close').addEventListener('click', () => this.cb.onGarageClose());
    document.getElementById('mission-end-btn').addEventListener('click', () => this.cb.onMissionEndContinue());
    document.getElementById('busted-btn').addEventListener('click', () => this.cb.onRespawn('busted'));
    document.getElementById('wasted-btn').addEventListener('click', () => this.cb.onRespawn('wasted'));
  }

  showTitle() {
    this._show('title-screen');
    const slots = listTopazBaySaveSlots();
    document.getElementById('save-slots').innerHTML = slots.map((s) => (
      `<div class="save-slot" data-slot="${s.slot}"><b>SAVE ${s.slot}</b><span>${s.label}</span></div>`
    )).join('');
    document.querySelectorAll('.save-slot').forEach((el) => {
      el.addEventListener('click', () => this.cb.onStart(el.dataset.slot));
    });
  }

  showPause(state) {
    this._show('pause-screen');
    document.getElementById('pause-summary').textContent =
      `MISSIONS ${state.missionsDone.length}/10  •  $${state.money.toLocaleString('en-US')}  •  RACES WON ${state.racesWon.length}/3  •  ${state.lastSaveLabel}`;
  }

  // The status screen is the game's honest depth report: every mission with
  // its check mark, the crew, the garage, district standing and stats.
  showStatus(state) {
    this._show('status-screen');
    document.getElementById('status-missions').innerHTML = STORY_MISSIONS.map((m) => {
      const done = state.missionsDone.includes(m.id);
      const next = !done && m.id === state.nextMissionId;
      return `<div class="status-row"><span class="${done ? 'done' : 'todo'}">${done ? '✓' : next ? '▶' : '○'}</span> ${m.id}. ${m.title} <span style="float:right">$${m.reward}</span></div>`;
    }).join('') + `<div class="status-row">RACES: ${STREET_RACES.map((r) => `${state.racesWon.includes(r.id) ? '✓' : '○'} ${r.name}`).join(' &nbsp; ')}</div>`;
    document.getElementById('status-crew').innerHTML = Object.entries(state.crew).map(([id, member]) => {
      const ability = TOPAZ_BAY_CREW_ABILITIES[id];
      return `<div class="status-row">${member.unlocked ? '✓' : '🔒'} ${member.name}<br><span style="font-size:16px;color:#ffd23f">[${ability.key}] ${ability.name} — ${ability.desc}</span></div>`;
    }).join('');
    document.getElementById('status-garage').innerHTML =
      `<div class="status-row" style="margin-top:10px"><b>GARAGE</b></div>` +
      GARAGE_UPGRADES.map((u) => `<div class="status-row">${u.name}: LEVEL ${state.garage[u.id] ?? 0}/${u.max}</div>`).join('') +
      `<div class="status-row">OWNED CARS: ${state.garage.ownedCars.map((c) => c.name).join(', ')}</div>` +
      `<div class="status-row" style="color:#7dff9a">CASH: $${state.money.toLocaleString('en-US')}</div>`;
    document.getElementById('status-standing').innerHTML = TOPAZ_BAY_DISTRICTS.map((d) => (
      `<div class="stand-row">${d.name} — ${state.standing[d.id]}%<div class="stand-track"><div class="stand-fill" style="width:${state.standing[d.id]}%"></div></div></div>`
    )).join('');
    const st = state.stats;
    document.getElementById('status-stats').innerHTML = [
      `DISTANCE DRIVEN: ${(st.distanceDriven / 1000).toFixed(1)} km`,
      `CARS STOLEN: ${st.carsStolen}`,
      `SHOTS FIRED: ${st.shotsFired}`,
      `EXPLOSIONS: ${st.explosions}`,
      `COPS EVADED: ${st.copsEvaded}`,
      `TIMES BUSTED: ${st.bustedCount} • WASTED: ${st.wastedCount}`,
      `PLAY TIME: ${Math.floor(st.playSeconds / 60)}m ${Math.floor(st.playSeconds % 60)}s`,
      `WANTED NOW: ${'★'.repeat(state.wanted)}${'☆'.repeat(5 - state.wanted)}`,
    ].map((line) => `<div class="status-row">${line}</div>`).join('');
  }

  showBriefing(mission) {
    this._show('briefing-screen');
    document.getElementById('briefing-title').textContent = `MISSION ${mission.id}: ${mission.title}`;
    document.getElementById('briefing-lines').innerHTML = mission.briefing.map((line) => {
      const [speaker, ...rest] = line.split(': ');
      return `<p><b>${speaker}:</b> ${rest.join(': ')}</p>`;
    }).join('') + `<p><b>REWARD:</b> $${mission.reward} + district standing</p>`;
  }

  showMissionComplete(mission) {
    this._show('mission-end-screen');
    document.getElementById('mission-end-title').textContent = 'MISSION COMPLETE';
    document.getElementById('mission-end-title').style.color = '#7dff9a';
    document.getElementById('mission-end-text').textContent =
      `${mission.title} — $${mission.reward} banked. ${mission.id === 10 ? 'You are the King of the Bay.' : `Mission ${mission.id + 1} waits. Press M when ready.`}`;
  }

  showMissionFailed(reason) {
    this._show('mission-end-screen');
    document.getElementById('mission-end-title').textContent = 'MISSION FAILED';
    document.getElementById('mission-end-title').style.color = '#ff6b6b';
    document.getElementById('mission-end-text').textContent = `${reason}. Press M to try again.`;
  }

  showGarage(state, garage) {
    this._show('garage-screen');
    document.getElementById('garage-money').textContent = `CASH: $${state.money.toLocaleString('en-US')}`;
    document.getElementById('garage-message').textContent = '';
    document.getElementById('garage-list').innerHTML = GARAGE_UPGRADES.map((u) => {
      const level = garage.level(u.id);
      const cost = garage.costOf(u.id);
      return `<div class="garage-row"><span>${u.name} — ${u.desc}<br>LEVEL ${level}/${u.max}</span>` +
        `<button class="btn" data-upgrade="${u.id}">${cost === null ? 'MAXED' : `BUY $${cost}`}</button></div>`;
    }).join('') + `<div class="garage-row"><span>OWNED CARS: ${garage.ownedCarList().map((c) => c.name + (c.active ? ' ★' : '')).join(' • ')}</span><span>ENTER YOUR CAR AT THE GARAGE MARKER</span></div>`;
    document.querySelectorAll('[data-upgrade]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const msg = garage.buyUpgrade(btn.dataset.upgrade);
        this.showGarage(state, garage);
        document.getElementById('garage-message').textContent = msg;
      });
    });
  }

  showBusted(fine) {
    this._show('busted-screen');
    document.getElementById('busted-text').textContent =
      `The TBPD caught Reno. Bail and impound cost $${fine}. Your car is gone; your story is not.`;
  }

  showWasted(cost) {
    this._show('wasted-screen');
    document.getElementById('wasted-text').textContent =
      `Reno went down. The hospital patches him up for $${cost}.`;
  }
}
