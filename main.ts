// NEON BAY HEAT 2 — a working gta6-01 entry (Node 22, standard library only).
// The game is this directory's game/ folder: NEON BAY HEAT 2, a top-down
// open-world crime game (seeded city with four districts and a beach, traffic
// AI, pedestrians, car stealing, a 5-star wanted system with police chases
// and a bust meter, DELIVER and GETAWAY missions, a mayhem combo, synth
// sound, minimap HUD, pause + save) written as plain static files a desktop
// browser loads offline — no library, no network request. This program hands
// it in: it copies game/ and screenshots/ from beside this file to /output
// and writes /output/dossier.json, the summary the judge reads, with the
// vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });

// NEON BAY HEAT 2 entry check: the dossier must carry the game's real
// screenshots (title, chase, city, mission) — refuse to hand in an entry
// whose screenshot set is missing, so a broken build never reaches the judge.
import { readdirSync } from 'node:fs';
const shots = existsSync(join(here, 'screenshots'))
  ? readdirSync(join(here, 'screenshots')).filter((f) => /\.(png|jpe?g)$/i.test(f))
  : [];
if (shots.length < 3) {
  throw new Error(`NEON BAY HEAT 2: expected at least 3 screenshots, found ${shots.length}`);
}
console.log(`NEON BAY HEAT 2: handing in ${shots.length} screenshots: ${shots.sort().join(', ')}`);

cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
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
