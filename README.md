# NEON BAY HEAT 2

A top-down open-world crime game that runs entirely in the browser — no
libraries, no network, just the kit's static `game/` folder.

## The city

One seeded city (3,360 × 2,520) grown fresh from the seed on every load:
a full avenue grid with lane markings and kerbs, four named districts
(Old Town, Neon Bay, The Docks, Palm Heights), hundreds of buildings with
lit windows and neon signs, scattered trees, and a beach running down the
east side into the water.

## What you do

- **Walk and drive.** On foot with WASD, sprint on SHIFT. Walk up to any
  car and press **E** to steal it — five vehicle types (coupe, sedan,
  taxi, van, pickup), moving traffic to jack and parked cars everywhere.
- **Traffic lives here.** Cars hold their lanes, turn at junctions, brake
  and honk when you cut them off. Pedestrians stroll the sidewalks and
  the beach, and bolt when a fast car bears down on them.
- **The law responds.** Steal, ram and run people down and your wanted
  level climbs through five stars. Cruisers roll in, steer for an
  intercept, and try to pin you; sit slow inside their reach and the bust
  meter fills. Break their line of sight long enough and the heat cools
  one star at a time. Getting busted costs a fine scaled to your stars.
- **Run jobs.** DELIVER packages across town against the clock, or take a
  GETAWAY: grabbing the stash draws heat by itself, and the clock runs
  slower while you still have stars — shaking them is the job. The
  objective marker, distance and timer stay on the HUD.
- **Mayhem pays.** Near misses, drifts, shunts and scares build a combo
  multiplier; when the chaos stops, the combo cashes out into your roll.
- **Full HUD.** Cash, jobs done, district name, wanted stars, bust meter,
  combo readout, and a live minimap with blips for police, traffic, your
  objective and you.
- **Sound, synthesized.** Engine, sirens, horns, pickups and the bust
  jingle are all WebAudio — there are no audio files.
- **Pause and save** on P; cash, jobs and position persist between visits.

## Layout

`game/src/` is split one job per file: `city.js` generates the world and
solves building collisions, `vehicles.js` is the car physics and the
traffic driver, `police.js` runs the wanted system and the chase,
`missions.js` hands out jobs and runs the mayhem combo, `peds.js` walks
the crowd, `render.js` paints the world, `hud.js` paints the HUD and
minimap, `audio.js` synthesizes the sound, `input.js` reads the keyboard,
`config.js` holds the tuning, `random.js` is the seeded generator, and
`main.js` wires it all together. `main.ts` at the root hands the game in
with its screenshots and dossier.

The four screenshots show the title screen, a four-star chase with a
delivery objective live, the city running down to the beach, and a
drop-off under pursuit.
