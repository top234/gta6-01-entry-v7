// TOPAZ BAY world configuration: the city's five districts, palette, tuning
// numbers and shared constants. Every other module reads from here so the city
// stays coherent: one sun-soaked coastal town, one set of rules.
export const TOPAZ_BAY_CONFIG = {
  cityHalf: 200,          // playable ground extends +/-200 on x and z
  roadGap: 40,            // grid roads every 40 units
  roadWidth: 11,
  blockInset: 8,          // buildings keep this far inside each block
  startTimeOfDay: 10.2,   // 10:12 — bright morning sun for the default view
  dayLengthSeconds: 600,  // one full game day per 10 real minutes
  gravity: 30,
  walkSpeed: 9,
  runSpeed: 14,
  carTopSpeed: 42,
  copTopSpeed: 46,
  maxWanted: 5,
  saveKeyPrefix: 'topazbay-save-v1-',
  saveSlots: ['A', 'B', 'C'],
};

// The five districts of Topaz Bay. Bounds are [minX, maxX, minZ, maxZ] in world
// units; the first district whose bounds contain a point owns that point.
export const TOPAZ_BAY_DISTRICTS = [
  { id: 'downtown', name: 'DOWNTOWN', bounds: [-60, 60, -60, 60], tint: 0x8fa3b8, tall: true },
  { id: 'marina', name: 'MARINA BAY', bounds: [-200, 200, 140, 200], tint: 0x7fd4c1, tall: false },
  { id: 'harbor', name: 'OLD HARBOR', bounds: [120, 200, -140, 140], tint: 0xc9a06a, tall: false },
  { id: 'hills', name: 'SUNSET HILLS', bounds: [-200, -120, -200, 140], tint: 0xd8b36a, tall: false },
  { id: 'northgate', name: 'NORTHGATE', bounds: [-120, 120, -200, -60], tint: 0x9db88a, tall: false },
];

export function districtAt(x, z) {
  for (const d of TOPAZ_BAY_DISTRICTS) {
    const [x0, x1, z0, z1] = d.bounds;
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return d;
  }
  // Between districts, the nearest district centre names the neighbourhood.
  let best = TOPAZ_BAY_DISTRICTS[0], bestD = Infinity;
  for (const d of TOPAZ_BAY_DISTRICTS) {
    const [x0, x1, z0, z1] = d.bounds;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const dd = (x - cx) * (x - cx) + (z - cz) * (z - cz);
    if (dd < bestD) { best = d; bestD = dd; }
  }
  return best;
}

// Sun-soaked palette: warm sand, ocean teal, coral roofs, white stucco.
export const TOPAZ_BAY_PALETTE = {
  sky: 0x87ceeb,
  sand: 0xe8d29a,
  sea: 0x1f8fb2,
  grass: 0x7fb069,
  road: 0x3a3f44,
  sidewalk: 0xb8b0a0,
  building: [0xf2e8d5, 0xe8b4a0, 0xd9e2e8, 0xf5d76e, 0xc9d6c5, 0xe8a87c, 0xffffff, 0xd4a5a5],
  roof: [0xc96f4a, 0x8a5a3b, 0x5a7a8a, 0x7a6a8a, 0x4a6a4a],
  car: [0xd7263d, 0x1b98a2, 0xf4d35e, 0x2e4057, 0xee964b, 0x8ac926, 0xf8f32b, 0x9b5de5, 0xffffff, 0x222222],
};
