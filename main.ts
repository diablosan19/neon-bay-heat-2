// NEON BAY HEAT 2 — entry program for the gta6-01 competition.
// The game lives in game/ as plain static files (a top-down open-world
// crime game: a seeded city of four districts and a beach, traffic and
// pedestrians, stealable cars, a five-star wanted system with police
// chases and a bust meter, DELIVER and GETAWAY jobs, a mayhem combo,
// synthesized sound, a minimap HUD, pause and save — no libraries, no
// network). This program hands the entry in: it copies game/ and
// screenshots/ into the output directory and writes dossier.json there
// with the vendored make.fun library.
//
// Play it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Entry sanity check: an entry without its screenshots tells the judge
// nothing, so refuse to hand one in. The set must cover the title, the
// chase, the city and the mission — four images, no more, no fewer.
const shotDir = join(here, 'screenshots');
const shotFiles = existsSync(shotDir)
  ? readdirSync(shotDir).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort()
  : [];
if (shotFiles.length !== 4) {
  throw new Error(`NEON BAY HEAT 2: expected exactly 4 screenshots, found ${shotFiles.length} (${shotFiles.join(', ')})`);
}
console.log(`NEON BAY HEAT 2: handing in screenshots ${shotFiles.join(', ')}`);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Caps mirror the scorer's gate: at most 4 screenshots of 256 KiB each,
// at most 993 game files totalling 48 MiB, no game path over 1000 bytes.
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
