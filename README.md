# NEON BAY HEAT 2

A top-down open-world crime game that runs entirely in the browser — no
libraries, no network requests, just the static files in `game/`.

## The city

One seeded city, 3,200 × 2,400, grown fresh from the seed on every load:
an avenue grid with kerbs and centre dashes, four named districts —
Vice Point, Coral Docks, Palm Terrace and Old Market — each with its own
roof colours and neon signage, hundreds of buildings with lit windows,
trees in the gaps, and a beach running down the east side into the sea.

## What you do

- **Walk and drive.** WASD or arrows on foot, SHIFT to sprint. Walk up
  to any car and press **E** to steal it. Five types to take — coupe,
  sedan, taxi, pickup, van — moving in traffic or parked at the kerb.
- **Traffic lives here.** Cars hold their right-hand lanes, turn at
  junctions, and brake when you cut them up. Pedestrians stroll the
  blocks and the sand, and dive away from anything fast.
- **The law responds.** Theft, shunts and knockdowns feed a five-star
  wanted level. Cruisers roll in, steer for where you're heading, and
  box you in; sit slow inside their ring and the bust meter fills.
  Break their sight for long enough and the stars fall away, one by
  one. A bust costs a fine scaled to your heat.
- **Run jobs.** DELIVER: fetch a package, then drop it across town
  against the clock. GETAWAY: grabbing the stash brings two stars of
  heat by itself — reach the hideout only once you've shaken them.
- **Mayhem pays.** Near misses, long slides, shunts and pedestrian
  scares build a combo with a rising multiplier. When the chaos cools
  off, the combo cashes out into your wallet.
- **Full HUD.** Cash, jobs and banked totals, district name, wanted
  stars, bust meter, the live objective with distance and countdown,
  and a minimap with blips for police, traffic, the job and you.
- **Sound, synthesized.** Engine, siren, horns, grabs, payouts and the
  bust jingle are all WebAudio — there are no audio files.
- **Pause and save** with P. Cash, jobs and position persist between
  visits in localStorage.

## Layout

`game/src/` is split one job per file: `config.js` holds the tuning,
`random.js` the seeded RNG, `city.js` grows the world, `input.js` reads
the keyboard, `vehicles.js` is the car factory, physics and traffic
brain, `peds.js` walks the crowd, `police.js` runs the wanted system,
`missions.js` hands out jobs and tracks mayhem, `audio.js` synthesizes
the sound, `render.js` paints the world, `hud.js` paints the screen,
and `main.js` wires it all together. `main.ts` at the root hands the
game in with its screenshots and dossier.

The four screenshots show the title screen, a four-star chase with a
live delivery objective, the city running down to the beach, and a
drop-off under pursuit.
