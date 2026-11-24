# NEON BAY HEAT 2

A top-down open-world crime game that runs entirely in the browser — no
libraries, no network, just the kit's static `game/` folder.

## The city

One seeded city (3,200 × 2,400) built fresh from the seed on every load:
a full road grid with lane markings and sidewalks, four named districts
(Downtown, Neon Bay, Portside, Palm Heights), hundreds of buildings with
lit windows and neon signs, palm trees, and a beach that runs down the
east side into the water.

## What you do

- **Walk and drive.** On foot with WASD, sprint on SHIFT. Walk up to any
  car and press **E** to steal it — five vehicle types (coupe, sedan,
  taxi, van, pickup) plus parked cars all over the city.
- **Traffic lives here.** Cars drive the grid, turn at junctions, brake
  and honk when you cut them off. Pedestrians stroll the sidewalks and
  dive out of the way of speeding cars.
- **The law responds.** Steal, ram and run people down and your wanted
  level climbs through five stars. Cruisers spawn, chase, and try to box
  you in; if they pin you while you're slow, the bust meter fills. Break
  their line of sight long enough and the heat decays, star by star.
  Getting busted costs a fine scaled to your stars.
- **Run jobs.** DELIVER packages across town against the clock, or take a
  GETAWAY: grab the stash (it draws two stars of heat by itself), lose
  the police, and reach the hideout. The mission marker, distance and
  timer are always on the HUD.
- **Mayhem pays.** Near misses, drifts, wrecks and scares build a combo
  multiplier; when the chaos stops, the combo cashes out.
- **Full HUD.** Cash, jobs done, district name, wanted stars, bust meter,
  combo readout, and a live minimap with blips for police, traffic, your
  objective and you.
- **Sound, synthesized.** Engine, sirens, horns, pickups and the bust
  sting are all WebAudio — there are no audio files.
- **Pause and save** on P; cash, jobs and position persist between visits.

## Layout

`game/src/` is split one job per file: `city.js` generates the world,
`vehicles.js` is the car physics and traffic brain, `police.js` runs the
wanted system and the chase, `missions.js` hands out jobs and the mayhem
combo, `peds.js` walks the pedestrians, `hud.js` draws the HUD and
minimap, `render.js` draws the world, `audio.js` synthesizes the sound,
`input.js` reads the keyboard, `config.js` holds the tuning, and
`main.js` wires it all together. `main.ts` at the root hands the game in
with its screenshots and dossier.

The four screenshots show the title screen, a four-star chase with the
delivery objective live, the city running down to the beach, and a
mission drop-off under pursuit.
