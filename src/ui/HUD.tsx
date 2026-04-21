import { useState } from 'react'
import { useGameStore } from '../game/store'
import { CITIES, VEHICLES } from '../game/constants'
import type { CityId } from '../game/types'
import { BUILDING_LAYOUT } from '../world/buildings'
import './HUD.css'

export default function HUD() {
 const health = useGameStore((s) => s.playerHealth)
 const coords = useGameStore((s) => s.playerPosition)
 const city = useGameStore((s) => s.currentCity)
 const inVehicle = useGameStore((s) => s.inVehicle)
 const interactionPrompt = useGameStore((s) => s.interactionPrompt)
 const damageFlash = useGameStore((s) => s.damageFlash)
 const isDead = useGameStore((s) => s.isDead)
 const isRespawning = useGameStore((s) => s.isRespawning)
 const setCity = useGameStore((s) => s.setCity)
 const timeOfDay = useGameStore((s) => s.timeOfDay)
 const setTimeOfDay = useGameStore((s) => s.setTimeOfDay)
 const vehicleSpeed = useGameStore((s) => s.vehicleSpeed)
 const isFalling = useGameStore((s) => s.isFalling)
 const npcs = useGameStore((s) => s.npcs)
 const playerRotation = useGameStore((s) => s.playerRotation)
 const [showMenu, setShowMenu] = useState(false)
 const [showCoords, setShowCoords] = useState(true)
 const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
 const speedPercent = Math.min(100, (vehicleSpeed / 200) * 100)

 const healthColor =
  health > 50 ? 'var(--color-green)' : health > 25 ? 'var(--color-amber)' : 'var(--color-magenta)'

 const healthSegments = Array.from({ length: 10 }, (_, i) => {
  const threshold = (i + 1) * 10
  return health >= threshold
 })

 return (
  <>
   {/* Top bar */}
   <div className="hud-topbar">
    {/* Left: Menu button */}
    <button className="menu-button" onClick={() => setShowMenu(!showMenu)} aria-label="Menu">
     <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
     </svg>
    </button>

    {/* Right: Time toggle + Coords */}
    <div className="hud-right">
     <button
      className={`time-toggle ${timeOfDay}`}
      onClick={() => setTimeOfDay(timeOfDay === 'night' ? 'day' : 'night')}
     >
      {timeOfDay === 'night' ? 'NIGHT' : 'DAY'}
     </button>
     {showCoords && (
      <div className="hud-coords">
       <span className="coord-label">POS</span>
       <span className="coord-value">
        {coords[0].toFixed(1)}, {coords[1].toFixed(1)}, {coords[2].toFixed(1)}
       </span>
      </div>
     )}
    </div>
   </div>

   {/* Settings menu overlay */}
   {showMenu && (
    <div className="settings-menu" onClick={() => setShowMenu(false)}>
     <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
      <div className="settings-header">
       <span className="settings-title">SETTINGS</span>
       <button className="settings-close" onClick={() => setShowMenu(false)}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
         <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
       </button>
      </div>
      <div className="settings-section">
       <label className="settings-label">CITY</label>
       <select
        value={city}
        onChange={(e) => setCity(e.target.value as CityId)}
        className="settings-select"
       >
        {CITIES.map((c) => (
         <option key={c.id} value={c.id}>{c.name}</option>
        ))}
       </select>
      </div>
      <div className="settings-section">
       <label className="settings-label">TIME</label>
       <button
        className={`settings-toggle ${timeOfDay}`}
        onClick={() => setTimeOfDay(timeOfDay === 'night' ? 'day' : 'night')}
       >
        {timeOfDay === 'night' ? 'Night' : 'Day'}
       </button>
      </div>
      <div className="settings-section">
       <label className="settings-label">SHOW COORDS</label>
       <button
        className={`settings-toggle-btn ${showCoords ? 'active' : ''}`}
        onClick={() => setShowCoords(!showCoords)}
       >
        {showCoords ? 'ON' : 'OFF'}
       </button>
      </div>
      <div className="settings-divider" />
      <div className="settings-section credits">
       <span className="credits-text">@SimonSaysGiveMeSmile 2026</span>
       <a
        href="https://github.com/SimonSaysGiveMeSmile/gtasf.lol"
        target="_blank"
        rel="noopener noreferrer"
        className="credits-link"
       >
        github.com/SimonSaysGiveMeSmile/gtasf.lol
       </a>
      </div>
     </div>
    </div>
   )}

   {/* Health bar */}
   <div className={`health-container ${isTouchDevice ? 'hud-topright' : ''}`}>
    <div className="health-label">
     <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--color-muted)', letterSpacing: 2 }}>
      HEALTH
     </span>
     <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: healthColor }}>
      {health}
     </span>
    </div>
    <div className="health-segments">
     {healthSegments.map((filled, i) => (
      <div
       key={i}
       className={`health-segment ${filled ? 'filled' : 'empty'}`}
       style={filled ? { backgroundColor: healthColor, boxShadow: `0 0 6px ${healthColor}` } : {}}
      />
     ))}
    </div>
   </div>

   {/* Minimap — top right on touch, bottom left otherwise */}
   <div className={`minimap-container ${isTouchDevice ? 'hud-topright-minimap' : ''}`}>
    <div className="minimap-header">
     <span className="minimap-title">RADAR</span>
    </div>
    <Minimap playerPosition={coords} npcs={npcs} playerRotation={playerRotation} />
    <div className="minimap-corners" />
   </div>

   {/* Vehicle indicator + speedometer — bottom right */}
   {inVehicle && (
    <div className="vehicle-indicator">
     <div className="vehicle-name-row">
      <span className="vehicle-name">{VEHICLES.find(v => v.type === 'cybertruck')?.name || 'VEHICLE'}</span>
     </div>
     <div className="speedometer">
      <div className="speed-gauge-track">
       <div className="speed-gauge-fill" style={{ width: `${speedPercent}%` }} />
      </div>
      <div className="speed-readout">
       <span className="speed-value">{Math.round(vehicleSpeed)}</span>
       <span className="speed-unit">km/h</span>
      </div>
     </div>
    </div>
   )}

   {/* Interaction prompt — bottom center */}
   {interactionPrompt && (
    <div className="interaction-prompt">
     <div className="interact-key">E</div>
     <span className="interact-text">{interactionPrompt}</span>
    </div>
   )}

   {/* Crosshair */}
   <div className={`crosshair ${interactionPrompt ? 'active' : ''}`}>
    <div className="crosshair-dot" />
    <div className="crosshair-ring" />
   </div>

   {/* Damage flash */}
   {damageFlash && <div className="damage-flash" />}

   {/* Death screen */}
   {isDead && (
    <div className="death-screen">
     <div className="death-overlay" />
     {!isRespawning ? (
      <div className="death-text">
       <div className="death-killed">WASTED</div>
       <div className="death-sub">You took too much damage</div>
      </div>
     ) : (
      <div className="respawn-text">
       <div className="respawn-label">RESPAWNING</div>
       <div className="respawn-dots">
        <span>.</span><span>.</span><span>.</span>
       </div>
      </div>
     )}
    </div>
   )}

   {/* Falling indicator */}
   {isFalling && !inVehicle && (
    <div className="falling-indicator">
     <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1L7 10M7 10L4 7M7 10L10 7" stroke="var(--color-magenta)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12H12" stroke="var(--color-magenta)" strokeWidth="1.5" strokeLinecap="round"/>
     </svg>
     <span className="falling-text">FALLING</span>
    </div>
   )}

   {/* Scanline overlay */}
   <div className="scanline-overlay" />
  </>
 )
}

interface MinimapProps {
 playerPosition: [number, number, number]
 npcs: import('../game/types').NPC[]
 playerRotation: number
}

function Minimap({ playerPosition, npcs, playerRotation }: MinimapProps) {
 const RANGE = 100
 const SIZE = 180
 const CENTER = SIZE / 2
 const MAP_SCALE = (SIZE / 2) / RANGE

 const cosR = Math.cos(-playerRotation)
 const sinR = Math.sin(-playerRotation)

 return (
  <div className="minimap-view">
   <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
    {/* Background grid rings */}
    {[0, 1, 2, 3, 4].map((i) => (
     <circle key={`grid-${i}`} cx={CENTER} cy={CENTER} r={(i / 5) * (SIZE / 2)} fill="none" stroke="var(--color-border)" strokeWidth={0.5} />
    ))}
    {/* Cardinal lines */}
    <line x1={CENTER} y1={0} x2={CENTER} y2={SIZE} stroke="var(--color-border)" strokeWidth={0.3} />
    <line x1={0} y1={CENTER} x2={SIZE} y2={CENTER} stroke="var(--color-border)" strokeWidth={0.3} />

    {/* Buildings as small rectangles */}
    {BUILDING_LAYOUT.map((b, i) => {
     const dx = (b.x - playerPosition[0]) * MAP_SCALE
     const dy = (b.z - playerPosition[2]) * MAP_SCALE
     const sx = CENTER - dx * cosR + dy * sinR
     const sy = CENTER - dx * sinR - dy * cosR
     // Only show buildings within minimap range
     if (Math.abs(sx - CENTER) > CENTER || Math.abs(sy - CENTER) > CENTER) return null
     const w = Math.max(1, b.width * MAP_SCALE * 0.5)
     const h = Math.max(1, b.depth * MAP_SCALE * 0.5)
     return (
      <rect
       key={`bld-${i}`}
       x={sx - w / 2}
       y={sy - h / 2}
       width={w}
       height={h}
       fill="rgba(0, 229, 255, 0.15)"
       stroke="rgba(0, 229, 255, 0.25)"
       strokeWidth={0.3}
      />
     )
    })}

    {/* NPCs as small white dots */}
    {npcs.slice(0, 20).map((npc) => {
     const dx = (npc.position[0] - playerPosition[0]) * MAP_SCALE
     const dy = (npc.position[2] - playerPosition[2]) * MAP_SCALE
     const sx = CENTER - dx * cosR + dy * sinR
     const sy = CENTER - dx * sinR - dy * cosR
     if (Math.abs(sx - CENTER) > CENTER || Math.abs(sy - CENTER) > CENTER) return null
     return <circle key={npc.id} cx={sx} cy={sy} r={1.5} fill="rgba(255,255,255,0.4)" />
    })}

    {/* Player dot */}
    <circle cx={CENTER} cy={CENTER} r={4} fill="var(--color-cyan)" />
    <circle cx={CENTER} cy={CENTER} r={8} fill="none" stroke="var(--color-cyan)" strokeWidth={1} opacity={0.4} />
   </svg>
   <div className="minimap-scale">
    <span>100m</span>
   </div>
  </div>
 )
}