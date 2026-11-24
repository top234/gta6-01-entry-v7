// TOPAZ BAY — boot and game loop. Builds the city, wires every system, and
// runs the frame: input, driving, police, missions, races, crew, radio, HUD.
import { TOPAZ_BAY_CONFIG, districtAt } from './config.js';
import { mulberry32SeededRandom, seedFromQuery } from './random.js';
import { TopazBayGameState } from './state.js';
import { loadTopazBayProgress, saveTopazBayProgress } from './save.js';
import { KeyboardMouseInput } from './input.js';
import { buildTopazBayCity } from './city.js';
import { buildStreetCar, createTrafficSystem } from './vehicles.js';
import { spawnTopazBayPedestrians } from './pedestrians.js';
import { PlayerOnFoot } from './player.js';
import { DrivingController } from './driving.js';
import { PoliceDispatch } from './police.js';
import { WeaponWheelArsenal } from './weapons.js';
import { CrewRoster, TOPAZ_BAY_CREW_ABILITIES } from './crew.js';
import { startStoryMission, updateStoryMission } from './missions.js';
import { StreetRaceManager, STREET_RACES } from './races.js';
import { GarageUpgrades } from './garage.js';
import { RadioStations } from './radio.js';
import { DayNightCycle } from './daynight.js';
import { spawnCarExplosion, spawnCarFire, spawnCarSmoke, updateEffects } from './effects.js';
import { ChaseCameraRig } from './camera.js';
import { TopazBayHud } from './hud.js';
import { MenuScreens } from './screens.js';
import { shotFromQuery, stageScreenshotShot } from './shots.js';

export function bootTopazBayGame() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('scene-container').appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 900);

  const rng = mulberry32SeededRandom(seedFromQuery());
  const state = new TopazBayGameState();
  const city = buildTopazBayCity(scene, rng);
  const input = new KeyboardMouseInput(renderer.domElement);
  const player = new PlayerOnFoot(scene);
  const traffic = createTrafficSystem(scene, city, rng, 16);
  const peds = spawnTopazBayPedestrians(scene, city, rng, 34);
  const police = new PoliceDispatch(scene, city, rng);
  const driving = new DrivingController();
  const weapons = new WeaponWheelArsenal(state);
  const crew = new CrewRoster(scene);
  const garage = new GarageUpgrades(state);
  const races = new StreetRaceManager(scene);
  const radio = new RadioStations(state);
  const daynight = new DayNightCycle(scene, city);
  const cameraRig = new ChaseCameraRig(camera);
  const hud = new TopazBayHud(state, city);

  // Tag every mesh with its owner so weapon raycasts know what they hit.
  for (const car of traffic.cars) car.mesh.userData.owner = { type: 'car', ref: car };
  for (const ped of peds.peds) ped.mesh.userData.owner = { type: 'ped', ref: ped };

  const ctx = {
    scene, camera, renderer, state, city, input, player, traffic, peds, police,
    driving, weapons, crew, garage, races, radio, daynight, cameraRig, hud,
    mode: 'title', elapsed: 0, onFootSpeed: 0, damageFlash: 0,
    missionTargets: [], beacon: null, missionMarker: null, missionTimer: 0,
    missionFailed: false, shotFrozen: false, lastWanted: 0, lastShotAt: -99,
    lastPedHitAt: -99, lastCrimeAt: -99, smokeTimer: 0, fireTimer: 0,
    crewAbilities: TOPAZ_BAY_CREW_ABILITIES,
    playerPos() {
      return driving.car ? { x: driving.car.mesh.position.x, z: driving.car.mesh.position.z } : { x: player.x, z: player.z };
    },
    playerHeading() { return driving.car ? driving.heading : player.heading; },
    autosave() { saveTopazBayProgress('A', state, ctx.playerPos(), !!driving.car); },
    onWeaponHit(kind, ref) {
      if (kind === 'cop' && ref.health <= 0) explodeCopCar(ref);
      if (kind === 'car' && ref.health <= 0) explodeTrafficCar(ref);
    },
  };

  // Reno's own car, parked at the garage. Entering it is always free.
  let ownedCar = null;
  function respawnOwnedCar() {
    if (ownedCar) scene.remove(ownedCar.mesh);
    const def = state.garage.ownedCars[state.garage.activeCar];
    const mesh = buildStreetCar(def.color, def.kind);
    mesh.position.set(city.markers.garage.x, 0, city.markers.garage.z + 8);
    mesh.rotation.y = Math.PI / 2;
    scene.add(mesh);
    ownedCar = { mesh, kind: def.kind, color: def.color, occupied: false, stolen: false, owned: true, health: 100, wrecked: false };
    mesh.userData.owner = { type: 'car', ref: ownedCar };
  }
  respawnOwnedCar();
  ctx.ownedCar = () => ownedCar;

  function syncDrivingUpgrades() {
    driving.engineLevel = state.garage.engine;
    driving.armorLevel = state.garage.armor;
  }
  syncDrivingUpgrades();

  function explodeTrafficCar(car) {
    if (car.wrecked) return;
    car.wrecked = true;
    spawnCarExplosion(scene, car.mesh.position.clone());
    state.stats.explosions += 1;
    cameraRig.addShake(0.9);
    if (car === driving.car) {
      const pos = { x: car.mesh.position.x, z: car.mesh.position.z };
      driving.exitCar();
      player.setPosition(pos.x + 3, pos.z + 3);
      player.mesh.visible = true;
      crew.deploy(state, player.x, player.z);
      state.health -= 30;
      ctx.damageFlash = 1;
    }
    car.mesh.visible = false;
  }

  function explodeCopCar(cop) {
    spawnCarExplosion(scene, cop.mesh.position.clone());
    state.stats.explosions += 1;
    scene.remove(cop.mesh);
    police.cops = police.cops.filter((c) => c !== cop);
    state.raiseWanted(1, ctx.elapsed);
  }

  function crime(stars, line) {
    if (ctx.elapsed - ctx.lastCrimeAt < 2 && stars > 0) return;
    ctx.lastCrimeAt = ctx.elapsed;
    state.raiseWanted(stars, ctx.elapsed);
    police.syncToWanted(state.wanted, ctx.playerPos());
    if (line) police.dispatchLine = line;
  }

  const screens = new MenuScreens({
    onStart(slot) {
      radio.ensureAudio();
      if (slot) {
        const data = loadTopazBayProgress(slot, state);
        if (data && data.playerPos) player.setPosition(data.playerPos[0], data.playerPos[1]);
        respawnOwnedCar();
        syncDrivingUpgrades();
      }
      crew.deploy(state, player.x, player.z);
      screens.hideAll();
      hud.show();
      hud.setObjective(state.nextMissionId ? `PRESS M TO START MISSION ${state.nextMissionId}` : 'STORY COMPLETE — FREE ROAM TOPAZ BAY');
      ctx.mode = 'playing';
    },
    onResume() { screens.hideAll(); hud.show(); ctx.mode = 'playing'; },
    onStatus() { screens.showStatus(state); ctx.mode = 'status'; },
    onStatusClose() { screens.hideAll(); hud.show(); ctx.mode = 'playing'; },
    onSave() {
      const ok = saveTopazBayProgress('A', state, ctx.playerPos(), !!driving.car);
      screens.showPause(state);
      hud.setBanner(ok ? 'GAME SAVED TO SLOT A' : 'SAVE FAILED');
    },
    onQuit() { screens.showTitle(); hud.hide(); ctx.mode = 'title'; },
    onBriefingStart() { screens.hideAll(); hud.show(); ctx.mode = 'playing'; radio.blip(660, 0.15); },
    onGarageClose() { syncDrivingUpgrades(); screens.hideAll(); hud.show(); ctx.mode = 'playing'; },
    onMissionEndContinue() { screens.hideAll(); hud.show(); ctx.mode = 'playing'; },
    onRespawn() {
      state.wanted = 0;
      state.health = 100;
      police.clearAll();
      player.setPosition(city.markers.policeStation.x, city.markers.policeStation.z);
      player.mesh.visible = true;
      crew.deploy(state, player.x, player.z);
      screens.hideAll(); hud.show(); ctx.mode = 'playing';
    },
  });
  ctx.screens = screens;

  document.querySelectorAll('.wheel-slot').forEach((slot) => {
    slot.addEventListener('click', () => {
      weapons.select(Number(slot.dataset.i));
      weapons.setWheelOpen(false);
    });
  });

  input.onKey = (code) => {
    if (ctx.mode === 'briefing' && (code === 'Enter' || code === 'Space')) screens.cb.onBriefingStart();
    if (ctx.mode === 'status' && (code === 'Tab' || code === 'Escape')) screens.cb.onStatusClose();
    if (ctx.mode === 'garage' && (code === 'KeyG' || code === 'Escape')) screens.cb.onGarageClose();
    if (ctx.mode === 'paused' && code === 'Escape') screens.cb.onResume();
    if (ctx.mode === 'mission-end' && code === 'Enter') screens.cb.onMissionEndContinue();
  };

  function enterNearestCar() {
    let best = null, bestD = 4.5 * 4.5;
    const near = (car) => {
      if (!car || car.occupied || car.wrecked) return;
      const dx = car.mesh.position.x - player.x, dz = car.mesh.position.z - player.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD) { best = car; bestD = d2; }
    };
    for (const car of traffic.cars) near(car);
    near(ownedCar);
    if (!best) return;
    player.mesh.visible = false;
    driving.enterCar(best, player.heading);
    crew.setInCar(true);
    if (!best.owned && !best.stolen) {
      best.stolen = true;
      state.stats.carsStolen += 1;
      crime(1, 'TBPD DISPATCH: VEHICLE THEFT ON BAY AVENUE — UNITS RESPOND.');
    }
    radio.blip(440, 0.1);
  }

  function exitCar() {
    const car = driving.exitCar();
    if (!car) return;
    player.setPosition(car.mesh.position.x + 3, car.mesh.position.z + 2);
    player.mesh.visible = true;
    crew.deploy(state, player.x, player.z);
  }

  function nearestRaceStart(pos) {
    for (const race of STREET_RACES) {
      const d = Math.hypot(pos.x - race.start.x, pos.z - race.start.z);
      if (d < 14) return race;
    }
    return null;
  }

  function updatePlaying(dt) {
    ctx.elapsed += dt;
    state.stats.playSeconds += dt;
    daynight.update(dt, state);
    crew.tickCooldowns(state, dt);

    // --- Input: menus, missions, radio, crew, wheel, car, races, garage ---
    if (input.wasPressed('KeyM') && !state.currentMission && !races.active && state.nextMissionId) {
      if (startStoryMission(ctx, state.nextMissionId)) ctx.mode = 'briefing';
    }
    if (input.wasPressed('Tab')) { screens.showStatus(state); ctx.mode = 'status'; return; }
    if (input.wasPressed('Escape') || input.wasPressed('KeyP')) { screens.showPause(state); ctx.mode = 'paused'; return; }
    if (input.wasPressed('KeyQ') && !driving.car) weapons.toggleWheel();
    if (weapons.wheelOpen) {
      for (let i = 0; i < 4; i += 1) {
        if (input.wasPressed(`Digit${i + 1}`)) { weapons.select(i); weapons.setWheelOpen(false); }
      }
    } else {
      if (input.wasPressed('KeyR')) { radio.ensureAudio(); radio.nextStation(); hud.setBanner(`RADIO: ${radio.current.name}`); }
      if (input.wasPressed('Digit1')) hud.setBanner(crew.useAbility(state, 'vera', ctx.elapsed, ctx));
      if (input.wasPressed('Digit2')) hud.setBanner(crew.useAbility(state, 'marco', ctx.elapsed, ctx));
      if (input.wasPressed('Digit3')) hud.setBanner(crew.useAbility(state, 'juno', ctx.elapsed, ctx));
    }
    if (input.wasPressed('KeyE')) {
      if (driving.car) exitCar();
      else enterNearestCar();
    }
    const pos = ctx.playerPos();
    const race = nearestRaceStart(pos);
    if (input.wasPressed('KeyT') && race && !races.active && !state.currentMission) {
      races.beginRace(ctx, race.id);
    }
    const garageD = Math.hypot(pos.x - city.markers.garage.x, pos.z - city.markers.garage.z);
    if (input.wasPressed('KeyG') && garageD < 16) { screens.showGarage(state, garage); ctx.mode = 'garage'; return; }

    // --- Movement: on foot or behind the wheel ---
    cameraRig.addMouse(input.mouseDX, input.mouseDY);
    if (driving.car) {
      const turbo = crew.turboActive ? 1.5 : 1;
      if (turbo > 1) driving.engineLevel = state.garage.engine + 3; // Marco's live tune
      const moved = driving.update(dt, input, city.colliders, traffic.cars.concat([ownedCar]), (health) => {
        ctx.damageFlash = Math.min(1, ctx.damageFlash + 0.35);
        cameraRig.addShake(0.35);
        if (health <= 0) explodeTrafficCar(driving.car);
      });
      if (turbo > 1) driving.engineLevel = state.garage.engine;
      state.stats.distanceDriven += moved;
      ctx.onFootSpeed = 0;
      // Running a pedestrian over is a crime the whole city sees.
      const hit = peds.knockDown(pos.x, pos.z, Math.abs(driving.speed) > 5 ? 2.6 : 0);
      if (hit > 0) {
        state.stats.pedsHit += hit;
        if (ctx.elapsed - ctx.lastPedHitAt > 3) {
          ctx.lastPedHitAt = ctx.elapsed;
          crime(1, 'TBPD DISPATCH: PEDESTRIAN DOWN — HIT AND RUN IN PROGRESS.');
        }
      }
    } else {
      const moved = player.update(dt, input, cameraRig.yaw, city.colliders);
      ctx.onFootSpeed = moved > 0 ? (input.down('ShiftLeft') ? TOPAZ_BAY_CONFIG.runSpeed : TOPAZ_BAY_CONFIG.walkSpeed) : 0;
      if (input.mouseClicked && !weapons.wheelOpen && state.weaponIndex > 0) {
        if (weapons.fire(ctx)) {
          ctx.lastShotAt = ctx.elapsed;
          crime(1, 'TBPD DISPATCH: SHOTS FIRED — UNITS RESPOND.');
        }
      }
    }

    // --- World: traffic, pedestrians, crew, police, missions, races ---
    traffic.update(dt, ctx.playerPos(), driving.car);
    peds.update(dt, ctx.elapsed - ctx.lastShotAt < 3 ? ctx.playerPos() : null);
    crew.update(dt, { x: player.x, z: player.z }, city.colliders, !!driving.car);
    weapons.update(dt);
    updateStoryMission(ctx, dt);
    races.update(ctx, dt);

    // Car damage states: smoke, then fire, then the explosion.
    const car = driving.car;
    if (car && !car.wrecked) {
      if (car.health < 60 && car.health > 0) {
        ctx.smokeTimer -= dt;
        if (ctx.smokeTimer <= 0) { ctx.smokeTimer = 0.22; spawnCarSmoke(scene, car.mesh); }
      }
      if (car.health < 30 && car.health > 0) {
        ctx.fireTimer -= dt;
        if (ctx.fireTimer <= 0) { ctx.fireTimer = 0.18; spawnCarFire(scene, car.mesh); }
        car.health -= 2.5 * dt;
      }
      if (car.health <= 0) explodeTrafficCar(car);
    }
    for (const tcar of traffic.cars) {
      if (tcar.health <= 0 && !tcar.wrecked && !tcar.occupied) explodeTrafficCar(tcar);
    }

    // Wanted decay: stay clean and out of sight, and the heat cools off.
    if (state.wanted !== ctx.lastWanted) {
      police.syncToWanted(state.wanted, ctx.playerPos());
      ctx.lastWanted = state.wanted;
    }
    if (state.wanted > 0 && ctx.elapsed - state.lastCrimeAt > 25) {
      const nearCop = police.cops.some((cop) => {
        const dx = cop.mesh.position.x - pos.x, dz = cop.mesh.position.z - pos.z;
        return dx * dx + dz * dz < 900;
      });
      if (!nearCop && !police.heli) {
        state.lowerWanted(1);
        state.lastCrimeAt = ctx.elapsed;
        if (state.wanted === 0) {
          state.stats.copsEvaded += 1;
          police.dispatchLine = 'TBPD DISPATCH: SUSPECT LOST — ALL UNITS STAND DOWN.';
          hud.setBanner('YOU LOST THE COPS');
        }
      }
    }
    const bust = police.update(dt, state.wanted, ctx.playerPos(), !!driving.car, ctx.playerHeading(), (dmg) => {
      if (driving.car) {
        driving.damage(dmg, () => {});
        ctx.damageFlash = Math.min(1, ctx.damageFlash + 0.1);
        cameraRig.addShake(0.15);
      }
    });
    if (bust === 'busted') {
      const fine = Math.min(state.money, 300 + state.wanted * 100);
      state.addMoney(-fine);
      state.stats.bustedCount += 1;
      screens.showBusted(fine);
      ctx.mode = 'busted';
      return;
    }
    if (state.health <= 0) {
      const cost = Math.min(state.money, 200);
      state.addMoney(-cost);
      state.stats.wastedCount += 1;
      screens.showWasted(cost);
      ctx.mode = 'wasted';
      return;
    }
    if (state.wanted === 0 && state.health < 100) state.health = Math.min(100, state.health + 1.5 * dt);

    // --- Prompts, camera, HUD ---
    let prompt = null;
    if (!driving.car) {
      const nearCar = traffic.nearestCar(player.x, player.z, 4.5);
      if (nearCar) prompt = 'PRESS E TO STEAL THE CAR';
      else if (ownedCar && Math.hypot(ownedCar.mesh.position.x - player.x, ownedCar.mesh.position.z - player.z) < 4.5) prompt = 'PRESS E TO DRIVE YOUR CAR';
    } else {
      prompt = 'PRESS E TO EXIT THE CAR';
    }
    if (race && !races.active && !state.currentMission) prompt = `PRESS T TO RACE — ${race.name} ($${race.prize})`;
    if (garageD < 16) prompt = 'PRESS G FOR THE GARAGE';
    hud.setPrompt(prompt);
    const focus = driving.car
      ? { x: driving.car.mesh.position.x, y: 1, z: driving.car.mesh.position.z }
      : { x: player.x, y: 1, z: player.z };
    cameraRig.update(dt, focus, ctx.playerHeading(), !!driving.car, driving.speedKmh);
    ctx.damageFlash = Math.max(0, ctx.damageFlash - dt * 1.8);
    updateEffects(scene, dt);
    hud.update(ctx, dt);
  }

  let titleAngle = 0.6;
  function updateTitle(dt) {
    titleAngle += dt * 0.03;
    const r = 170;
    camera.position.set(Math.sin(titleAngle) * r, 62, Math.cos(titleAngle) * r);
    camera.lookAt(0, 0, 20);
    traffic.update(dt, null, null);
    peds.update(dt, null);
    updateEffects(scene, dt);
  }

  const clock = new THREE.Clock();
  let firstFrame = true;
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (ctx.shotFrozen) {
      renderer.render(scene, camera);
      return;
    }
    if (ctx.mode === 'playing') updatePlaying(dt);
    else if (ctx.mode === 'title') updateTitle(dt);
    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      const shot = shotFromQuery();
      if (shot) {
        stageScreenshotShot(ctx, shot);
      } else {
        screens.showTitle();
      }
      window.__TOPAZ_READY__ = true;
    }
    input.endFrame();
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  daynight.apply(state.timeOfDay);
  crew.deploy(state, player.x, player.z);
  camera.position.set(0, 60, 200);
  camera.lookAt(0, 0, 0);
  window.__topaz = ctx;
  loop();
}

bootTopazBayGame();
