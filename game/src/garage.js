// The Sunset Hills garage: Reno's workshop. Engine and armor upgrades, paint
// jobs and the owned-car roster — all bought with mission and race money.
import { TOPAZ_BAY_PALETTE } from './config.js';

export const GARAGE_UPGRADES = [
  { id: 'engine', name: 'ENGINE TUNE', desc: '+14% top speed per level', max: 3, cost: [600, 1200, 2400] },
  { id: 'armor', name: 'ARMOR PLATING', desc: '-20% damage taken per level', max: 3, cost: [500, 1000, 2000] },
  { id: 'paint', name: 'PAINT JOB', desc: 'A fresh coat for the Bay Runner', max: 5, cost: [200, 200, 200, 200, 200] },
];

export class GarageUpgrades {
  constructor(state) {
    this.state = state;
  }

  level(id) {
    return this.state.garage[id] ?? 0;
  }

  costOf(id) {
    const up = GARAGE_UPGRADES.find((u) => u.id === id);
    const level = this.level(id);
    if (!up || level >= up.max) return null;
    return up.cost[level];
  }

  // Buy one level. Returns a status line for the garage screen.
  buyUpgrade(id) {
    const up = GARAGE_UPGRADES.find((u) => u.id === id);
    if (!up) return 'UNKNOWN UPGRADE';
    const level = this.level(id);
    if (level >= up.max) return `${up.name}: ALREADY MAXED`;
    const cost = up.cost[level];
    if (this.state.money < cost) return `${up.name}: NOT ENOUGH CASH ($${cost} NEEDED)`;
    this.state.addMoney(-cost);
    this.state.garage[id] = level + 1;
    if (id === 'paint') {
      const car = this.state.garage.ownedCars[this.state.garage.activeCar];
      if (car) car.color = TOPAZ_BAY_PALETTE.car[(level + 3) % TOPAZ_BAY_PALETTE.car.length];
    }
    return `${up.name}: LEVEL ${level + 1} INSTALLED`;
  }

  // The player's own car, parked at the garage: entering it is always free.
  ownedCarList() {
    return this.state.garage.ownedCars.map((car, i) => ({
      ...car, active: i === this.state.garage.activeCar,
    }));
  }

  selectOwnedCar(index) {
    if (index >= 0 && index < this.state.garage.ownedCars.length) {
      this.state.garage.activeCar = index;
      return true;
    }
    return false;
  }
}
