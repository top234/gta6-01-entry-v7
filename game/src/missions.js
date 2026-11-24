// The story of Topaz Bay: ten missions for Reno Arka and his crew, from a
// first drive to the Marina lookout to the finale that crowns the King of the
// Bay. Each mission is a chain of stages — drive, steal, hold, evade, survive,
// race, eliminate — with a briefing, a beacon marker and a payout.
import { buildPedestrianMesh } from './pedestrians.js';

export const STORY_MISSIONS = [
  { id: 1, title: 'WELCOME TO TOPAZ BAY', district: 'marina', reward: 800,
    briefing: ['VERA: Reno! You made it. Topaz Bay eats slow drivers alive.', 'VERA: Take a car and meet me at the Marina lookout. The view sells the city.'],
    stages: [{ type: 'drive', x: 0, z: 176, label: 'DRIVE TO THE MARINA LOOKOUT', radius: 12 }] },
  { id: 2, title: 'THE COURIER RUN', district: 'harbor', reward: 1200,
    briefing: ['MARCO: A package for the harbor boys. No questions, no stops.', 'MARCO: Drop it at Old Harbor, then swing back downtown.'],
    stages: [
      { type: 'drive', x: 170, z: 20, label: 'DELIVER THE PACKAGE TO OLD HARBOR', radius: 12 },
      { type: 'drive', x: 0, z: 0, label: 'RETURN DOWNTOWN', radius: 12 },
    ] },
  { id: 3, title: 'HOT WHEELS', district: 'hills', reward: 1000,
    briefing: ['VERA: The garage needs stock. Lift something nice — any car on the street.', 'VERA: Bring it to the Sunset Hills garage. Cops hate that trick.'],
    stages: [
      { type: 'steal', label: 'STEAL A CAR (PRESS E BESIDE TRAFFIC)' },
      { type: 'drive', x: -150, z: 100, label: 'DELIVER THE STOLEN CAR TO THE GARAGE', radius: 12 },
    ] },
  { id: 4, title: "VERA'S GRID", district: 'northgate', reward: 1500,
    briefing: ['VERA: The comms tower watches every plate in Northgate.', 'VERA: Get up there, hold the uplink for ten seconds, then vanish.'],
    stages: [
      { type: 'goto', x: -80, z: -160, label: 'REACH THE COMMS TOWER', radius: 12 },
      { type: 'hold', x: -80, z: -160, label: 'HOLD THE UPLINK — HACK IN PROGRESS', seconds: 10, radius: 12 },
      { type: 'evade', label: 'LOSE THE HEAT' },
    ] },
  { id: 5, title: 'HARBOR HEAT', district: 'harbor', reward: 1800,
    briefing: ['JUNO: The harbor crew is cornered and TBPD is all over it.', 'JUNO: Draw the heat for sixty seconds, then meet me at the plaza.'],
    stages: [
      { type: 'survive', label: 'SURVIVE THE HEAT — 60s', seconds: 60 },
      { type: 'goto', x: 0, z: 150, label: 'MEET JUNO AT MARINA PLAZA', radius: 12 },
    ] },
  { id: 6, title: "MARCO'S GAUNTLET", district: 'marina', reward: 2000,
    briefing: ['MARCO: The Bayfront Sprint. Beat my rivals and the street is ours.', 'MARCO: Win the race. Second place is a nice view of my bumper.'],
    stages: [{ type: 'race', raceId: 'bayfront', label: 'WIN THE BAYFRONT SPRINT' }] },
  { id: 7, title: 'THE DROP', district: 'marina', reward: 2200,
    briefing: ['VERA: Three lookouts watch the plaza drop. They work for the harbor crew.', 'VERA: Clear them out, grab the case, run it to Old Harbor.'],
    stages: [
      { type: 'eliminate', label: 'CLEAR THE 3 LOOKOUTS AT THE PLAZA', count: 3, x: 0, z: 150 },
      { type: 'drive', x: 170, z: 20, label: 'RUN THE CASE TO OLD HARBOR', radius: 12 },
    ] },
  { id: 8, title: 'NIGHT RUN', district: 'downtown', reward: 2500,
    briefing: ['MARCO: Three drops, one tank, no time to waste. The clock is the enemy.', 'MARCO: Hit every checkpoint before the time runs out.'],
    stages: [
      { type: 'timed', x: 0, z: 176, label: 'CHECKPOINT 1 — MARINA', seconds: 150, radius: 12 },
      { type: 'timed', x: -160, z: -100, label: 'CHECKPOINT 2 — SUNSET HILLS', seconds: 150, radius: 12 },
      { type: 'timed', x: 160, z: 0, label: 'CHECKPOINT 3 — OLD HARBOR', seconds: 150, radius: 12 },
    ] },
  { id: 9, title: 'VULTURE DOWN', district: 'downtown', reward: 3000,
    briefing: ['VERA: VULTURE-1 is up. Four stars, the whole department hunting you.', 'VERA: Ninety seconds. Survive it, then go dark.'],
    stages: [
      { type: 'survive', label: 'SURVIVE 4 STARS — 90s (VULTURE-1 IS UP)', seconds: 90 },
      { type: 'evade', label: 'LOSE THE HEAT' },
    ] },
  { id: 10, title: 'KING OF THE BAY', district: 'harbor', reward: 5000,
    briefing: ['MARCO: Last job. Win the Harbor Loop, outrun the whole city.', 'VERA: Finish at the lookout. The Bay will know your name.'],
    stages: [
      { type: 'race', raceId: 'harbor', label: 'WIN THE HARBOR LOOP' },
      { type: 'survive', label: 'OUTRUN 3 STARS — 45s', seconds: 45 },
      { type: 'drive', x: 0, z: 176, label: 'FINISH AT THE MARINA LOOKOUT', radius: 12 },
    ] },
];

export function startStoryMission(ctx, id) {
  const mission = STORY_MISSIONS.find((m) => m.id === id);
  if (!mission) return false;
  ctx.state.currentMission = id;
  ctx.state.missionStage = 0;
  ctx.missionTimer = 0;
  ctx.missionTargets = [];
  ctx.missionFailed = false;
  if (id === 5) ctx.state.raiseWanted(2, ctx.elapsed);
  if (id === 9) ctx.state.raiseWanted(4, ctx.elapsed);
  // Mission 10 raises its own heat at stage 2 (see advanceStoryMission).
  ctx.police.syncToWanted(ctx.state.wanted, ctx.playerPos());
  const stage = mission.stages[0];
  if (stage.type === 'eliminate') spawnLookouts(ctx, stage);
  if (stage.type === 'race') ctx.races.beginRace(ctx, stage.raceId);
  setMissionBeacon(ctx, stage);
  ctx.screens.showBriefing(mission);
  ctx.hud.setObjective(stage.label);
  ctx.hud.setBanner(`MISSION ${id}: ${mission.title}`);
  return true;
}

export function spawnLookouts(ctx, stage) {
  ctx.missionTargets = [];
  for (let i = 0; i < stage.count; i += 1) {
    const mesh = buildPedestrianMesh(0xcc2222, 0x222222, 0xe0ac69);
    mesh.scale.setScalar(1.15);
    const x = stage.x + (i - 1) * 6;
    const z = stage.z + (i % 2 === 0 ? 4 : -4);
    mesh.position.set(x, 0, z);
    const target = { mesh, x, z, alive: true };
    mesh.userData.owner = { type: 'lookout', ref: target };
    ctx.scene.add(mesh);
    ctx.missionTargets.push(target);
  }
}

export function setMissionBeacon(ctx, stage) {
  if (ctx.beacon) { ctx.scene.remove(ctx.beacon); ctx.beacon = null; }
  ctx.missionMarker = null;
  if (stage && (stage.x !== undefined)) {
    const geo = new THREE.CylinderGeometry(1.6, 1.6, 30, 12, 1, true);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
    const beacon = new THREE.Mesh(geo, mat);
    beacon.position.set(stage.x, 15, stage.z);
    ctx.scene.add(beacon);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(4, 6, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(stage.x, 0.15, stage.z);
    beacon.add(ring);
    ctx.beacon = beacon;
    ctx.missionMarker = { x: stage.x, z: stage.z, label: stage.label };
  }
}

export function updateStoryMission(ctx, dt) {
  const { state } = ctx;
  if (!state.currentMission || ctx.missionFailed) return;
  const mission = STORY_MISSIONS.find((m) => m.id === state.currentMission);
  const stage = mission.stages[state.missionStage];
  if (!stage) return;
  const pos = ctx.playerPos();
  const inCar = !!ctx.driving.car;
  let done = false;
  if (stage.type === 'goto' || stage.type === 'drive') {
    const d = Math.hypot(pos.x - stage.x, pos.z - stage.z);
    if (d < stage.radius && (stage.type === 'goto' || inCar)) done = true;
    if (stage.type === 'drive' && d < stage.radius && !inCar) {
      ctx.hud.setObjective(`${stage.label} — IN A CAR!`);
    }
  } else if (stage.type === 'steal') {
    if (inCar && ctx.driving.car.stolen) done = true;
  } else if (stage.type === 'hold') {
    const d = Math.hypot(pos.x - stage.x, pos.z - stage.z);
    if (d < stage.radius) {
      ctx.missionTimer += dt;
      ctx.hud.setObjective(`${stage.label} — ${Math.ceil(stage.seconds - ctx.missionTimer)}s`);
      if (ctx.missionTimer >= stage.seconds) {
        done = true;
        state.raiseWanted(2, ctx.elapsed);
        ctx.police.syncToWanted(state.wanted, pos);
      }
    } else {
      ctx.missionTimer = Math.max(0, ctx.missionTimer - dt);
    }
  } else if (stage.type === 'evade') {
    if (state.wanted === 0) done = true;
  } else if (stage.type === 'survive') {
    ctx.missionTimer += dt;
    ctx.hud.setObjective(`${stage.label.split('—')[0]}— ${Math.ceil(stage.seconds - ctx.missionTimer)}s LEFT`);
    if (ctx.missionTimer >= stage.seconds) done = true;
  } else if (stage.type === 'race') {
    if (ctx.races.lastResult === 'won') done = true;
    if (ctx.races.lastResult === 'lost') failStoryMission(ctx, 'RACE LOST — THE RIVALS TOOK IT');
  } else if (stage.type === 'eliminate') {
    const left = ctx.missionTargets.filter((t) => t.alive).length;
    ctx.hud.setObjective(`${stage.label} — ${left} LEFT`);
    if (left === 0) done = true;
  } else if (stage.type === 'timed') {
    ctx.missionTimer += dt;
    const d = Math.hypot(pos.x - stage.x, pos.z - stage.z);
    if (d < stage.radius && inCar) done = true;
    else ctx.hud.setObjective(`${stage.label} — ${Math.max(0, Math.ceil(stage.seconds - ctx.missionTimer))}s`);
    if (ctx.missionTimer >= stage.seconds && !done) failStoryMission(ctx, 'TIME UP — THE RUN FAILED');
  }
  if (done) advanceStoryMission(ctx, mission);
}

export function advanceStoryMission(ctx, mission) {
  ctx.state.missionStage += 1;
  ctx.missionTimer = 0;
  ctx.hud.setBanner('OBJECTIVE COMPLETE');
  if (ctx.state.missionStage >= mission.stages.length) {
    completeStoryMission(ctx, mission);
    return;
  }
  const stage = mission.stages[ctx.state.missionStage];
  if (stage.type === 'eliminate') spawnLookouts(ctx, stage);
  if (stage.type === 'race') ctx.races.beginRace(ctx, stage.raceId);
  if (mission.id === 10 && ctx.state.missionStage === 1) {
    ctx.state.raiseWanted(3, ctx.elapsed);
    ctx.police.syncToWanted(ctx.state.wanted, ctx.playerPos());
  }
  setMissionBeacon(ctx, stage);
  ctx.hud.setObjective(stage.label);
}

export function completeStoryMission(ctx, mission) {
  ctx.state.completeMission(mission.id);
  ctx.state.addMoney(mission.reward);
  ctx.state.gainStanding(mission.district, 18);
  if (mission.id === 3 && ctx.driving.car) {
    ctx.state.garage.ownedCars.push({ name: 'STOLEN RIDE', color: ctx.driving.car.color, kind: ctx.driving.car.kind });
  }
  if (mission.id === 5) {
    ctx.state.crew.juno.unlocked = true;
    ctx.crew.deploy(ctx.state, ctx.player.x, ctx.player.z);
  }
  if (ctx.beacon) { ctx.scene.remove(ctx.beacon); ctx.beacon = null; }
  ctx.missionMarker = null;
  for (const t of ctx.missionTargets) ctx.scene.remove(t.mesh);
  ctx.missionTargets = [];
  ctx.hud.setBanner(`MISSION COMPLETE — +$${mission.reward}`);
  ctx.hud.setObjective(ctx.state.nextMissionId ? `NEXT: MISSION ${ctx.state.nextMissionId} — PRESS M TO START` : 'STORY COMPLETE — YOU ARE THE KING OF THE BAY');
  ctx.screens.showMissionComplete(mission);
  ctx.autosave();
}

export function failStoryMission(ctx, reason) {
  ctx.missionFailed = true;
  ctx.state.currentMission = null;
  ctx.state.missionStage = 0;
  if (ctx.beacon) { ctx.scene.remove(ctx.beacon); ctx.beacon = null; }
  ctx.missionMarker = null;
  for (const t of ctx.missionTargets) ctx.scene.remove(t.mesh);
  ctx.missionTargets = [];
  ctx.hud.setBanner(`MISSION FAILED — ${reason}`);
  ctx.hud.setObjective('PRESS M TO RETRY THE MISSION');
  ctx.screens.showMissionFailed(reason);
}
