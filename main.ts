// NEON BAY HEAT 2 — the entry program for gta6-01.
// The game itself lives in game/ as plain static files: a top-down
// open-world crime game with a seeded four-district city and beach,
// lane traffic, pedestrians, stealable cars, a five-star wanted system
// with chases and a bust meter, DELIVER and GETAWAY jobs, a mayhem
// combo, synthesized audio, a minimap HUD, pause and save. No libraries,
// no network. This program hands it in: it copies game/ and
// screenshots/ into the output directory and writes dossier.json there
// using the vendored make.fun library.
//
// Play locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for
// /output:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Screenshot sanity check, done before anything is copied: the judge
// reads the pictures first, so an entry whose screenshot folder is
// missing or incomplete must fail here rather than be handed in mute.
// The expected set is exactly the four framed scenes — title, chase,
// city, mission — each a PNG or JPEG.
const shotDir = join(here, 'screenshots');
const found = existsSync(shotDir)
  ? readdirSync(shotDir).filter((name) => /\.(png|jpe?g)$/i.test(name)).sort()
  : [];
if (found.length !== 4) {
  throw new Error(`NEON BAY HEAT 2: need exactly 4 screenshots, found ${found.length}: ${found.join(', ') || '(none)'}`);
}
console.log(`NEON BAY HEAT 2: handing in screenshots ${found.join(', ')}`);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps below mirror the scorer's own gate (reference/gate.json):
// no more than 4 screenshots and none over 256 KiB, no more than 993
// game files or 48 MiB of game in total, no game path over 1000 bytes.
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
