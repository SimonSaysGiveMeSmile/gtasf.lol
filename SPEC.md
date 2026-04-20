# GTA 6: Founder Simulator — Technical Specification

## 1. Concept & Vision

**Founder Simulator** is a browser-native open-world life simulator set in a stylized, neon-drenched San Francisco Bay Area. You play as a founder navigating the trials of startup life — pitching investors in downtown high-rises, networking at rooftop raves, developing products in converted warehouse spaces, and rock climbing in Marin. The aesthetic blends cyberpunk neon with Bay Area fog, creating a world that feels like San Francisco after midnight: glowing, electric, slightly surreal.

The game world is explorable on foot, by vehicle (Tesla Cybertruck, sports cars), by plane, and by boat. NPCs populate the streets with scripted routines. The city is your oyster.

**Tagline:** *Build. Pitch. Survive.*

---

## 2. Design Language

### Aesthetic Direction
**"Neon Fog" — Bay Area Noir**: Deep midnight blues and blacks as the base, with electric cyan as the dominant accent, hot magenta for danger/health, and amber for interactions. The city glows through fog like a blade runner coastal city. UI elements feel like cockpit HUDs — glassy panels, sharp angles, subtle scan-line textures.

### Color Palette
```
--color-void:        #050510   (deepest background)
--color-night:       #0a0a1f   (scene background / fog color)
--color-surface:     #12122a   (panel backgrounds)
--color-surface-alt: #1a1a3e   (elevated surfaces)
--color-border:      #2a2a5a   (subtle borders)
--color-cyan:        #00e5ff   (primary accent — neon cyan)
--color-cyan-dim:    #00a0b2   (muted cyan)
--color-magenta:     #ff0080   (health / danger)
--color-amber:       #ffb300   (interaction / vehicle)
--color-green:       #00ff88   (success / health bar)
--color-white:       #e8e8ff   (text primary)
--color-muted:       #6a6a9a   (text secondary)
```

### Typography
- **Display / HUD**: `Orbitron` (geometric, futuristic, sharp) — health bars, speedometers, minimap labels
- **Data / Mono**: `JetBrains Mono` — coordinates, debug info, spawn points
- **Body / UI**: `Exo 2` (clean, slightly futuristic but readable) — menus, tooltips, descriptions

### Spatial System
- 8px base unit grid
- HUD elements: 12px corner radius, 1px glowing borders
- Glassy panels with `backdrop-filter: blur(12px)` and 60% opacity backgrounds
- Sharp neon glow effects via `box-shadow` with color spread

### Motion Philosophy
- **Entrance**: HUD elements slide in from edges with fade (300ms ease-out)
- **Damage flash**: Full-screen red overlay pulse (150ms)
- **Respawn**: Screen fade to black (1s), fade in (1s) with vignette
- **Vehicle enter/exit**: Camera smooth transition (500ms spring)
- **Minimap blips**: Pulse animation on NPC markers
- **Health bar**: Smooth width transitions (200ms), color shifts green→amber→magenta

### Visual Assets
- All 3D assets generated procedurally with Three.js geometry (no external model files)
- Buildings: Extruded rectangles with emissive window patterns
- Vehicles: Composed of box/cylinder geometry with material variation
- Character: Capsule body + sphere head with simple limb suggestions
- Trees: Cone + cylinder
- Street elements: Lamps (cylinder + sphere), traffic lights, road markings

---

## 3. Layout & Structure

### Main Canvas (Full Viewport)
```
┌─────────────────────────────────────────────────┐
│  [City Selector] ─────────────── [Debug: coords]│  ← Top HUD bar
│                                                 │
│                                                 │
│               3D WORLD VIEW                     │
│           (React Three Fiber Canvas)            │
│                                                 │
│                                                 │
│ ┌──────────┐                                    │
│ │ MINIMAP  │                                    │
│ │ (200x200)│  [Health Bar]  [Speed/Status]      │  ← Bottom HUD
│ └──────────┘                                    │
└─────────────────────────────────────────────────┘
```

### HUD Layers (HTML over Canvas)
1. **Top Bar**: City selector dropdown (left), coordinates/debug info (right)
2. **Bottom-Left**: Minimap (200×200px, rounded corners, glowing border)
3. **Bottom-Center**: Health bar (300px wide, segmented look)
4. **Bottom-Right**: Speed indicator / vehicle mode indicator
5. **Center**: Crosshair (small dot + subtle ring, changes on interactable)
6. **Overlay**: Damage flash, respawn fade, interaction prompts

### Responsive Strategy
- Minimum supported: 1280×720
- HUD scales with viewport, minimap fixed size
- City selector collapses to icon on narrow screens

---

## 4. Features & Interactions

### 4.1 Open-World Map
- **Default**: San Francisco Bay Area (central SF)
- **City Selector**: Dropdown to switch between: SF Bay, Los Angeles, NYC, Miami, London
- **Implementation**: Mapbox GL JS satellite tiles as ground plane with custom fog/lighting
- **Buildings**: Procedurally generated on map tiles — random heights (3-25 floors), varied footprints, emissive windows that glow at night
- **Roads**: Derived from OpenStreetMap data (pre-baked geometry for initial version)
- **Terrain layers**: Water (bay/ocean), ground (streets, parks), buildings, vegetation
- **Fog**: Exponential fog matching scene background color for depth
- **Lighting**: Ambient (dim blue) + directional (soft moonlight) + point lights (street lamps)

### 4.2 Playable Character
- **Representation**: Capsule body (radius 0.3, height 1.8) + sphere head (radius 0.25)
- **Movement**: WASD keys (W: forward, S: backward, A: strafe left, D: strafe right)
- **Camera**: Third-person follow camera (distance 5 units behind, height 2.5), mouse to orbit
- **Running**: Hold Shift to sprint (1.5× speed)
- **Jumping**: Space bar (with gravity)
- **Interactions**:
  - E key to enter vehicles (when within 3 units)
  - Approach NPCs to trigger interaction prompts
  - Click to interact with certain world objects
- **Collision**: Physics body with capsule collider, bounces off buildings/vehicles
- **Footstep sound**: Web Audio API tick on step intervals (optional, low priority)

### 4.3 Vehicles
- **Library**:
  1. **Tesla Cybertruck** — angular box truck, electric blue emissive accents
  2. **Tesla Model S** — sleek sedan shape
  3. **Sports Car** — low, wide, aggressive profile
  4. **SUV** — tall boxy shape
  5. **Sedan** — standard car shape
- **Physics**: Box collider + 4 cylinder wheels with motor forces
- **Controls** (when inside vehicle):
  - W/S: Accelerate forward/reverse
  - A/D: Steer left/right
  - Space: Brake/handbrake
  - Shift: Boost (temporary speed increase)
- **Properties**: Max speed, acceleration, turn rate, friction
- **Damage**: Collision detection — speed of impact reduces player health
- **Entry/Exit**: Press E near vehicle → camera animates to driver seat, player disappears → press E to exit at current location

### 4.4 NPCs
- **Pedestrians**: Walking NPCs on sidewalks, following waypoint paths
  - Simple state machine: walk → pause → walk
  - React to player: look toward player when within 10 units, flee if player is sprinting toward them
  - Random spawn on sidewalks
  - ~30-50 active pedestrians
- **Traffic NPCs**: Drive along roads following lanes
  - Follow predefined routes on road network
  - Stop at intersections (simple traffic light logic)
  - React to player: slow down if player is in front
  - ~15-20 active traffic NPCs

### 4.5 Planes (Flying Vehicles)
- **Appearance**: Small aircraft with wings (box body + wing boxes)
- **Controls**: W/S for throttle, mouse pitch/roll, A/D for yaw
- **Physics**: Physics body with lift force (upward force proportional to forward speed)
- **Entry**: Same E key interaction
- **Flight ceiling**: Max altitude 500 units

### 4.6 Boats
- **Appearance**: Hull shape (box tapered at front)
- **Physics**: Lower center of gravity, buoyancy simulation (push up when below water level)
- **Controls**: Same as cars but more drifty, drift on turns
- **Entry**: Same E key interaction
- **Water zone**: Designated area where boat can float

### 4.7 Minimap
- **Position**: Bottom-left, 200×200px
- **Content**: Top-down orthographic view of surrounding area
  - Player dot (cyan, pulsing)
  - Vehicle indicator (amber when in vehicle)
  - NPCs as small dots (white)
  - Buildings as grey shapes
  - Water as blue area
- **Update**: Real-time position tracking
- **Range**: 200-unit radius around player
- **Border**: Glowing cyan border with corner accents

### 4.8 Health System
- **Health Bar**: 100 HP max, segmented into 10 blocks
- **Damage Sources**:
  - Vehicle collision: `(impactSpeed * 2)` HP damage, minimum 5 km/h for damage
  - Fall from height: `(fallDistance * 5)` HP, minimum 3 units fall
  - NPC-vehicle collision: Same as above
- **Visual Feedback**:
  - < 50 HP: Health bar amber
  - < 25 HP: Health bar magenta, screen edges tint red
  - 0 HP: Death sequence
- **Death Sequence**:
  1. Player ragdolls (falls to ground)
  2. Screen fades to black (1 second)
  3. "RESPAWN" text fades in (centered, Orbitron font)
  4. After 3 seconds, fade in at last safe position
  5. Health restored to 100%

---

## 5. Component Inventory

### HUD Components

#### `<TopBar />`
- **Default**: City selector (left), coordinates display (right)
- **Style**: Semi-transparent dark panel, 48px height, full width, glass blur

#### `<CitySelector />`
- **Default**: Dropdown showing current city name + dropdown icon
- **Open**: Dark dropdown panel with city options, hover highlights in cyan
- **Transition**: Scale + fade in (200ms)

#### `<Minimap />`
- **Default**: 200×200 top-down view, circular mask or rounded corners
- **Player Marker**: Cyan dot with pulse animation
- **NPC Markers**: White dots, smaller, no pulse
- **Border**: 2px solid cyan with corner accent lines
- **Background**: Slightly darkened satellite tile

#### `<HealthBar />`
- **Full**: 10 green segments
- **Damaged**: Segments deplete right-to-left, color shifts
- **Critical**: Magenta, pulsing glow
- **Zero**: Empty, player dies

#### `<SpeedIndicator />`
- **On foot**: Hidden or shows walking icon + "Idle" / "Walking" / "Running"
- **In vehicle**: Shows km/h speed, vehicle name, with analog gauge aesthetic

#### `<InteractionPrompt />`
- **Default**: Hidden
- **Near vehicle/NPC**: Shows "[E] Enter Vehicle" / "[E] Talk to NPC" with key icon
- **Animation**: Fade in, slight bob

#### `<Crosshair />`
- **Default**: Small cyan dot (4px) with thin outer ring (16px)
- **Near interactable**: Ring expands, turns amber
- **Style**: CSS-only overlay

#### `<DamageOverlay />`
- **Trigger**: On damage
- **Effect**: Red vignette flash (150ms in, 300ms out)

#### `<DeathScreen />`
- **Trigger**: Health reaches 0
- **Effect**: Full black fade, "RESPAWN" text in Orbitron, auto-dismiss after 3s

### 3D World Components

#### `<Player />`
- Capsule + head geometry, cyan emissive accent on backpack/shoulders
- Shadow casting

#### `<Vehicle />` (parametrized by type)
- Tesla Cybertruck, Model S, Sports, SUV, Sedan
- Each has unique color, proportions, emissive details
- Headlights (point lights), taillights (emissive)

#### `<NPC />`
- Simplified humanoid shape (capsule body, sphere head)
- Color variations per NPC
- Walking animation (oscillating position)

#### `<Building />`
- Procedural box geometry with window pattern
- Emissive windows at night
- Varied heights (10-80 units)

#### `<StreetProps />`
- Street lamps: Cylinder + sphere top (emissive)
- Traffic lights: Box pole + 3 colored spheres
- Fire hydrants, benches, trash cans

#### `<Water />`
- Reflective plane with animated normal map
- Semi-transparent blue material
- Buoyancy zone for boats

#### `<MapTiles />`
- Mapbox satellite imagery as ground plane texture
- Tile loading as player moves

---

## 6. Technical Approach

### Framework & Build
- **Vite** + **React 18** + **TypeScript**
- **Port**: 4001
- Dev: `vite --port 4001`
- Build: `vite build`

### 3D Rendering Stack
- **Three.js** (r160+)
- **@react-three/fiber** v8 — React renderer for Three.js
- **@react-three/drei** v9 — Helpers: MapControls, KeyboardControls, useKeyboardControls, Html, etc.
- **@react-three/cannon** v6 — Physics (via @react-three/pepjng)

### State Management
- **Zustand** — Global game state: player position, health, current vehicle, NPCs, game mode

### Key Libraries
```json
{
  "@react-three/fiber": "^8.x",
  "@react-three/drei": "^9.x",
  "@react-three/cannon": "^6.x",
  "three": "^0.160.x",
  "zustand": "^4.x",
  "@types/three": "^0.160.x",
  "mapbox-gl": "^3.x"
}
```

### Architecture

#### Game State Store (Zustand)
```typescript
interface GameState {
  // Player
  playerPosition: [number, number, number];
  playerHealth: number;
  playerMode: 'onfoot' | 'vehicle' | 'plane' | 'boat';
  inVehicle: string | null;

  // World
  currentCity: 'sf' | 'la' | 'nyc' | 'miami' | 'london';
  timeOfDay: 'day' | 'night';

  // NPCs
  npcs: NPC[];

  // Actions
  takeDamage: (amount: number) => void;
  enterVehicle: (vehicleId: string) => void;
  exitVehicle: () => void;
  respawn: () => void;
  setCity: (city: string) => void;
}
```

#### Physics World
- Single physics world (cannon-es)
- Gravity: -30 (slightly exaggerated for game feel)
- Player: Dynamic body, capsule shape
- Vehicles: Dynamic body, box shape + wheel constraints
- Buildings: Static bodies
- NPCs: Dynamic bodies (lighter mass)

#### Input System
- `KeyboardControls` from drei to map WASD/Shift/Space/E
- Custom mouse handler for camera orbit
- Pointer lock on canvas click for smooth camera control

#### Map Loading
- Mapbox GL JS for satellite tile rendering
- Tile coordinate system: zoom level 15 tiles
- Only load tiles within 3-tile radius of player
- Cache loaded tiles in memory

### File Structure
```
src/
├── main.tsx                    # Entry point
├── App.tsx                     # Root component
├── index.css                   # Global styles + CSS variables
├── game/
│   ├── store.ts               # Zustand game state
│   ├── constants.ts           # City configs, vehicle specs, etc.
│   └── types.ts               # TypeScript interfaces
├── world/
│   ├── World.tsx              # Main 3D scene
│   ├── MapTiles.tsx           # Mapbox ground plane
│   ├── Buildings.tsx          # Procedural buildings
│   ├── Trees.tsx              # Procedural trees
│   ├── Water.tsx              # Water plane for boats
│   ├── StreetProps.tsx        # Lamps, traffic lights, etc.
│   └── Sky.tsx                # Sky/fog/lighting
├── player/
│   ├── Player.tsx             # Player character mesh + physics
│   ├── PlayerControls.tsx     # Input handling
│   └── Camera.tsx             # Third-person camera
├── vehicles/
│   ├── Vehicle.tsx            # Base vehicle component
│   ├── VehicleSpawner.tsx     # Manages vehicle pool
│   ├── TeslaCybertruck.tsx    # Tesla variant
│   ├── TeslaModelS.tsx        # Tesla variant
│   ├── SportsCar.tsx          # Generic sports car
│   ├── SUV.tsx                # Generic SUV
│   ├── Sedan.tsx              # Generic sedan
│   ├── Plane.tsx              # Flying vehicle
│   └── Boat.tsx               # Water vehicle
├── npcs/
│   ├── NPC.tsx                # NPC component
│   ├── NPCCrowd.tsx           # Manages pedestrian NPCs
│   └── TrafficManager.tsx     # Manages driving NPCs
├── ui/
│   ├── HUD.tsx                # Main HUD container
│   ├── TopBar.tsx             # City selector + coords
│   ├── Minimap.tsx            # Bottom-left map
│   ├── HealthBar.tsx          # Health display
│   ├── SpeedIndicator.tsx     # Vehicle speed
│   ├── Crosshair.tsx          # Center crosshair
│   ├── InteractionPrompt.tsx  # E key prompts
│   ├── DamageOverlay.tsx      # Red flash on damage
│   └── DeathScreen.tsx        # Respawn screen
└── systems/
    ├── Physics.tsx            # Physics world provider
    ├── InputManager.tsx       # Global input setup
    └── AudioManager.tsx       # Web Audio for effects
```

### Asset Strategy
All 3D assets are **procedurally generated** from Three.js primitives:
- Buildings: `BoxGeometry` with varying dimensions + `MeshStandardMaterial`
- Vehicles: Composition of `BoxGeometry` + `CylinderGeometry` parts
- Characters: `CapsuleGeometry` + `SphereGeometry`
- Props: `CylinderGeometry`, `SphereGeometry`, `BoxGeometry`
- Textures: Procedural patterns on `CanvasTexture`

### Performance Targets
- 60 FPS on modern hardware
- LOD for buildings (3 levels based on distance)
- Frustum culling (automatic via Three.js)
- Max 50 NPCs, max 20 vehicles active
- Texture atlas for window patterns

---

## 7. Implementation Phases

### Phase 1: Foundation
- Project scaffold (Vite + React + TS + all deps)
- Basic Three.js canvas with fog/lighting
- Simple ground plane (no map tiles yet)
- Player character with WASD movement
- Third-person camera
- Basic HUD (top bar, minimap placeholder)

### Phase 2: World
- Mapbox satellite tiles as ground
- Procedural buildings
- Street props
- Water planes
- City selector
- Trees and vegetation

### Phase 3: Vehicles
- Vehicle physics (base implementation)
- Tesla Cybertruck model
- Vehicle enter/exit system
- Drive controls
- Additional vehicle types

### Phase 4: NPCs
- Pedestrian NPCs with pathfinding
- Traffic NPCs with road following
- NPC reactions to player
- NPC-vehicle interaction

### Phase 5: Special Vehicles & Polish
- Plane (flying physics)
- Boat (water physics)
- Health system and damage
- Respawn system
- Full HUD polish
- Minimap details
- Visual effects (damage flash, etc.)