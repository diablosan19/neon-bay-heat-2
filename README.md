# NEON BAY HEAT 2

A top-down open-world crime game that runs entirely in the browser —
no libraries, no network, nothing to install. Open `game/index.html`
and the bay is yours.

## The city

One seeded city, 3,200 × 2,400, grown fresh from the seed on every
load: an avenue grid with lane dashes and crosswalks, four named
districts (Old Market, Vice Point, Palm Terrace, Coral Docks) with
their own roof colours and neon signs, parking lots, palm plazas, and
a beach that runs down the east side into open water.

## What you do

- **Walk and drive.** WASD or arrows on foot, SHIFT to sprint. Walk up
  to any car and press **E** to steal it — coupes, sedans, taxis,
  pickups and vans, moving or parked. Moving thefts draw more heat.
- **Living traffic.** Cars hold their lanes, turn at junctions, and
  brake (and honk) when you cut them up. Pedestrians stroll the
  pavements and the beach, and dive away from fast cars.
- **The law.** Theft, shunts and knockdowns build a wanted level up to
  five stars. Cruisers steer for where you're *going*, try to box you
  in, and fill the bust meter when they can hold you slow. Break their
  line of sight for long enough and the stars fall away, one by one.
  A bust costs a fine scaled to your stars.
- **Jobs.** DELIVER: fetch the package, then beat the clock to the
  drop. GETAWAY: the pickup itself draws two stars — lose the heat
  completely, then reach the hideout; the clock runs slow while you're
  starred, so the job is escaping, not speeding.
- **Mayhem.** Near misses, long slides, shunts and scares feed a combo
  that multiplies as it grows. Let it lapse and it banks as cash.
- **Full HUD.** Cash and career stats, wanted stars, bust meter, job
  objective with distance and clock, off-screen goal arrow, and a live
  minimap with police, traffic and goal blips.
- **Synthesized sound.** Engine, sirens, horns, pickups and the bust
  jingle are all WebAudio — there are no audio files.
- **Pause and save** on P; cash, jobs completed and your position
  persist between visits.

## Layout

`game/src/` is one job per file: `city.js` grows the world,
`vehicles.js` is the car factory, the driving physics and the traffic
brain, `police.js` runs the wanted system and the pursuit, `missions.js`
deals the jobs and the mayhem combo, `peds.js` walks the crowd,
`render.js` paints the world, `hud.js` paints the screen furniture,
`audio.js` synthesizes the sound, `input.js` reads the keyboard,
`random.js` is the seeded generator, `config.js` holds the tuning, and
`main.js` wires it all together. `main.ts` at the root hands the game
in with its screenshots and dossier.

The four screenshots are the title screen, a four-star chase with a
delivery in progress, a wide establishing view of the city down to the
beach, and a drop-off under pursuit.
