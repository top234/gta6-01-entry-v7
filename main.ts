// TOPAZ BAY — a sun-soaked open-world crime game for the make.fun gta6-01 bounty.
// Entry program (Node 22, standard library only). It hands the game in: copies the
// static game/ folder and the screenshots/ folder beside this file into the output
// directory, then writes /output/dossier.json with the kit's vendored library.
// The grader runs this program twice and both runs must write the same bytes, so
// nothing here depends on the clock, the network, or the order the filesystem
// happens to list files in. Outside the grader, MAKEFUN_OUTPUT_DIR stands in
// for /output:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Topaz Bay resolves its output directory from the environment first so a local
// run never touches the grader's /output path by accident.
function topazBayOutputDir(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  return fromEnv && fromEnv.length > 0 ? fromEnv : '/output';
}

const here = fileURLToPath(new URL('.', import.meta.url));
const out = topazBayOutputDir();

// Fail fast with a readable error instead of handing in a half-built entry.
if (!existsSync(join(here, 'game', 'index.html'))) {
  throw new Error('TOPAZ BAY: game/index.html is missing — nothing to hand in.');
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of
// game files, or a path under game/ over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
