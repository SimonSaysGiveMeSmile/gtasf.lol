# Founder Simulator — San Francisco

An original open-world startup sim set on the real street grid of downtown San Francisco.
Browser-based: React, TypeScript, Vite, Three.js / React Three Fiber, Zustand.

**Story mode** — nine chapters from a Tenderloin SRO to ringing the bell on Pine Street. Every
objective is a real building pulled from OpenStreetMap (Cable Car Coffee, Digital Garage, Moscone
West, the Montgomery Street towers, Hallidie Plaza, 140 New Montgomery, the Pacific Exchange
Building…). Dialogue with choices, stats (cash / MRR / hype / team / equity), timed drives,
deliveries, a guerrilla-marketing collect-a-thon, a rival chase, and an IPO ending ranked by valuation.
Progress saves to `localStorage` at chapter boundaries.

**Free roam** — drive, explore, take side-gig deliveries.

## Tech stack

- React 18 · TypeScript · Vite
- Three.js / React Three Fiber / drei
- Zustand (game + story state)
- Rigged characters & vehicles: Kenney (CC0) — see `public/models/CREDITS.md`
- Map data: © OpenStreetMap contributors (ODbL), baked into `src/game/maps/`

## Project layout

```
src/
├── story/            campaign: chapters.ts (content), storyStore.ts (state machine + save),
│                     StoryRunner.tsx (in-canvas triggers/beacons), StoryUI.tsx (title, dialogue, HUD)
├── characters/       KenneyCharacter.tsx — rigged GLB + animation clips, shared by player/NPCs/contacts
├── world/            OSM city renderer: textured facades/roofs, roads, props, lighting, colliders
├── player/ vehicles/ npcs/  on-foot controller, drivable cars, pedestrians + traffic AI
├── game/             core store, map data, side gigs, police
└── ui/               HUD, radar, settings, loading screen, touch controls
```

### Coordinates

The downtown map is metres relative to 37.7875 N, −122.405 W (+x east, +z north).
`src/story/geo.ts` converts lat/lon ↔ world and snaps points to the road network.

## Local development

Requirements: Node.js 20+, npm 10+.

```bash
npm install
npm run dev      # http://127.0.0.1:4001
```

## Production build

```bash
npm run build    # tsc -b && vite build → dist/
npm run preview
```

## Vercel deployment

Static Vite site (framework preset `Vite`, output `dist`). The project is linked to the `hireal`
team; always deploy to production so the URL isn't SSO-gated:

```bash
vercel --prod
```

## Controls

| Action | Desktop | Touch |
|---|---|---|
| Move / run / jump | WASD · Shift · Space | joystick · RUN · JUMP |
| Talk / enter or exit vehicle | F (or E) | F button |
| Drive: throttle / brake & reverse | W / S | joystick |
| Drive: steer · handbrake · boost | A/D · Space · Shift | joystick · BRAKE · BOOST |
| Advance dialogue / pick answer | Space · 1–3 | tap |
| Look | drag mouse | drag |

## Driving model

Ground vehicles use an arcade-realistic model (`src/vehicles/VehicleSpawner.tsx`, `Vehicle`):
engine force tapers toward the spec top speed, S brakes while rolling and reverses once stopped,
Space is a handbrake that cuts tyre grip (drifts), steering is a bicycle model whose lock shrinks
with speed, and sideways velocity bleeds off with grip so hard turns slide instead of pivoting.
The chase camera widens its FOV and hangs back with speed. Front wheels steer, wheels spin, tail /
brake / reverse lights react, the player sits in the driver's seat, and street lamps knock over
when hit above ~15 km/h. Traffic obeys a global two-phase signal cycle at intersections.

## Verification checklist

- `npx tsc -b`
- `npm run build`
- Load the game: title screen → **New story** → prologue card → dialogue advances with Space →
  beacon + objective panel visible → walk to Priya, F opens the choice dialogue → Chapter 1 begins.
