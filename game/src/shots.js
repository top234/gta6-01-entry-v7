// Screenshot staging for Topaz Bay: ?shot=cover|foot|status|title puts the
// live game into a composed, frozen state — the same code the player plays,
// the same HUD, no edits, no composites. The starter kit stages its shots the
// same way (shots.json); these are real renders of the game's own code.
import { startStoryMission } from './missions.js';
import { buildStreetCar } from './vehicles.js';

export function shotFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get('shot');
}

export function stageScreenshotShot(ctx, name) {
  ctx.screens.hideAll();
  ctx.hud.show();
  ctx.mode = 'playing';
  ctx.state.timeOfDay = 10.2; // bright morning sun for every shot
  ctx.daynight.apply(ctx.state.timeOfDay);
  if (name === 'cover') stageChaseCover(ctx);
  else if (name === 'foot') stageOnFootMission(ctx);
  else if (name === 'status') stageStatusScreen(ctx);
  else if (name === 'title') stageTitleScreen(ctx);
  ctx.hud.update(ctx, 0);
  ctx.shotFrozen = true;
  window.__TOPAZ_SHOT__ = name;
}

function stageChaseCover(ctx) {
  const s = ctx.state;
  s.money = 12450;
  s.missionsDone = [1, 2];
  s.health = 100;
  // Player car: a dedicated red sports car mid-chase on the north-south
  // avenue (a hero car, not a random traffic car).
  const heroMesh = buildStreetCar(0xd7263d, 'sports');
  heroMesh.position.set(0, 0, 112);
  heroMesh.rotation.y = Math.PI;
  ctx.scene.add(heroMesh);
  const car = { mesh: heroMesh, kind: 'sports', color: 0xd7263d, occupied: true, stolen: true, health: 100, wrecked: false };
  heroMesh.userData.owner = { type: 'car', ref: car };
  ctx.driving.enterCar(car, Math.PI);
  ctx.driving.speed = 33; // ~119 km/h on the speed chip
  ctx.player.mesh.visible = false;
  ctx.crew.setInCar(true); // the crew rides along — nobody stands in the road
  // Depth: traffic ahead on the same avenue.
  ctx.traffic.cars[1].mesh.position.set(-2, 0, 66);
  ctx.traffic.cars[2].mesh.position.set(3, 0, 30);
  ctx.traffic.cars[1].occupied = true;
  ctx.traffic.cars[2].occupied = true;
  // The pursuit: two TBPD units tight behind, VULTURE-1 overhead, roadblock ahead.
  s.wanted = 3;
  ctx.police.syncToWanted(3, { x: 0, z: 108 });
  // The pursuit fans out behind the player car, all ON the avenue (x=0 road)
  // so no building ever blocks the chase; the camera sits on the road too.
  const cops = ctx.police.cops;
  // Two units flanking the hero car, two more closing in behind it.
  const copSpots = [[-4, 120], [4.5, 124], [3.5, 108], [-4.5, 108]];
  cops.forEach((cop, i) => {
    if (!copSpots[i]) return;
    cop.mesh.position.set(copSpots[i][0], 0, copSpots[i][1]);
    cop.heading = Math.PI;
    cop.mesh.rotation.y = 0;
  });
  ctx.police._spawnHeli({ x: 10, z: 100 });
  ctx.police.heli.group.position.set(10, 13, 100); // close and low over the avenue — big in frame
  if (ctx.police.roadblock) {
    ctx.police.roadblock.group.position.set(0, 0, 58);
    ctx.police.roadblock.group.rotation.y = 0;
  }
  ctx.police.dispatchLine = 'TBPD DISPATCH: VULTURE-1 HAS EYES — ROADBLOCK ON BAY AVENUE.';
  ctx.hud.setObjective('ESCAPE THE TBPD — LOSE THE HEAT');
  ctx.hud.setBanner('WANTED ★★★ — TBPD PURSUIT', 60000);
  ctx.cameraRig.snapTo(new THREE.Vector3(0, 6.5, 130), new THREE.Vector3(0, 1.2, 104));
}

function stageOnFootMission(ctx) {
  const s = ctx.state;
  s.money = 8420;
  s.missionsDone = [1, 2, 3, 4, 5, 6];
  s.health = 92;
  s.weaponIndex = 2; // Street SMG on the wheel
  ctx.player.setPosition(0, 158);
  ctx.player.heading = Math.PI;
  ctx.player.mesh.rotation.y = Math.PI;
  ctx.crew.deploy(s, 0, 158);
  // Mission 7 in progress: lookouts at the plaza, beacon overhead.
  startStoryMission(ctx, 7);
  ctx.screens.hideAll();
  ctx.hud.show();
  ctx.hud.bannerUntil = 0; // keep the centre clear so the weapon wheel reads
  ctx.hud.setObjective('CLEAR THE 3 LOOKOUTS AT THE PLAZA — 3 LEFT');
  ctx.weapons.setWheelOpen(true);
  ctx.cameraRig.snapTo(new THREE.Vector3(-7, 6, 172), new THREE.Vector3(0, 1.5, 148));
}

function stageStatusScreen(ctx) {
  const s = ctx.state;
  s.money = 12450;
  s.missionsDone = [1, 2, 3, 4];
  s.racesWon = ['bayfront'];
  s.garage.engine = 2; s.garage.armor = 1; s.garage.paint = 1;
  s.garage.ownedCars = [
    { name: 'BAY RUNNER', color: 0x1b98a2, kind: 'sedan' },
    { name: 'STOLEN RIDE', color: 0xd7263d, kind: 'sports' },
  ];
  s.crew.juno.unlocked = true;
  s.standing = { downtown: 45, marina: 62, harbor: 30, hills: 55, northgate: 20 };
  s.stats = {
    distanceDriven: 48200, carsStolen: 6, shotsFired: 148, pedsHit: 2,
    copsEvaded: 4, explosions: 3, playSeconds: 2841, bustedCount: 1, wastedCount: 0,
  };
  s.wanted = 0;
  s.health = 100;
  ctx.hud.hide();
  ctx.screens.showStatus(s);
  ctx.mode = 'status';
}

function stageTitleScreen(ctx) {
  ctx.hud.hide();
  ctx.screens.showTitle();
  ctx.mode = 'title';
  ctx.cameraRig.snapTo(new THREE.Vector3(70, 55, 210), new THREE.Vector3(0, 8, -20));
}
