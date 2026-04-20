import { useGameStore } from '../game/store'
import { CITIES } from '../game/constants'
import { BUILDING_LAYOUT } from '../world/buildings'
import type { CityId } from '../game/types'
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
  const speedPercent = Math.min(100, (vehicleSpeed / 200) * 100)
  const isFalling = useGameStore((s) => s.isFalling)

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
        <div className="hud-city-selector">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value as CityId)}
            className="city-select"
          >
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="hud-right">
          <button
            className={`time-toggle ${timeOfDay}`}
            onClick={() => setTimeOfDay(timeOfDay === 'night' ? 'day' : 'night')}
          >
            {timeOfDay === 'night' ? '☾ NIGHT' : '☀ DAY'}
          </button>
          <div className="hud-coords">
            <span className="coord-label">POS</span>
            <span className="coord-value">
              {coords[0].toFixed(1)}, {coords[1].toFixed(1)}, {coords[2].toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Minimap */}
      <div className="minimap-container">
        <div className="minimap-header">
          <span className="minimap-title">RADAR</span>
        </div>
        <Minimap />
        <div className="minimap-corners" />
      </div>

      {/* Health bar */}
      <div className="health-container">
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

      {/* Vehicle indicator */}
      {inVehicle && (
        <div className="vehicle-indicator">
          <div className="vehicle-name-row">
            <span className="vehicle-name">VEHICLE</span>
          </div>
          <div className="speedometer">
            <div className="speed-gauge-track">
              <div
                className="speed-gauge-fill"
                style={{ width: speedPercent + '%' }}
            />
            <div className="speed-readout">
              <span className="speed-value">{Math.round(vehicleSpeed)}</span>
              <span className="speed-unit">km/h</span>
            </div>
          </div>
        </div>
      )}

      {/* Interaction prompt */}
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
          <span className="falling-icon">▼</span>
          <span className="falling-text">FALLING</span>
        </div>
      )}

      {/* Scanline overlay */}
      <div className="scanline-overlay" />
    </>
  )
}

function Minimap() {
  const playerPosition = useGameStore((s) => s.playerPosition)
  const npcs = useGameStore((s) => s.npcs)

  const RANGE = 100
  const SIZE = 180
  const CENTER = SIZE / 2

  // Water shapes at map edges (static blue areas)
  const WATER_SHAPES = [
    // Top-left water
    { path: `M 0 0 L ${SIZE * 0.35} 0 L ${SIZE * 0.35} ${SIZE * 0.25} L 0 ${SIZE * 0.3} Z`, opacity: 0.5 },
    // Top-right water
    { path: `M ${SIZE * 0.65} 0 L ${SIZE} 0 L ${SIZE} ${SIZE * 0.3} L ${SIZE * 0.65} ${SIZE * 0.25} Z`, opacity: 0.5 },
    // Bottom-left bay
    { path: `M 0 ${SIZE * 0.7} Q ${SIZE * 0.2} ${SIZE * 0.6} ${SIZE * 0.35} ${SIZE * 0.85} Q ${SIZE * 0.4} ${SIZE} 0 ${SIZE} Z`, opacity: 0.6 },
    // Bottom-right bay
    { path: `M ${SIZE * 0.65} ${SIZE} Q ${SIZE * 0.8} ${SIZE * 0.9} ${SIZE} ${SIZE * 0.65} L ${SIZE} ${SIZE} Z`, opacity: 0.6 },
  ]

  return (
    <div className="minimap-view">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Background grid */}
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={`grid-${i}`} cx={CENTER} cy={CENTER} r={(i / 5) * (SIZE / 2)} fill="none" stroke="var(--color-border)" strokeWidth={0.5} />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={`line-${i}`} x1={CENTER} y1={i * SIZE / 4} x2={SIZE} y2={CENTER} stroke="var(--color-border)" strokeWidth={0.3} />
        ))}

        {/* Water areas at map edges */}
        {WATER_SHAPES.map((w, i) => (
          <path key={`water-${i}`} d={w.path} fill="rgba(0, 30, 80, 0.7)" opacity={w.opacity} />
        ))}

        {/* Buildings from BUILDING_LAYOUT */}
        {BUILDING_LAYOUT.map((building, i) => {
          // Transform world coords to minimap coords (relative to player)
          const dx = (building.x - playerPosition[0]) / RANGE * (SIZE / 2)
          const dy = (building.z - playerPosition[2]) / RANGE * (SIZE / 2)
          const sx = CENTER - dx
          const sy = CENTER - dy

          // Skip buildings outside minimap bounds (with a small margin)
          if (sx < -10 || sx > SIZE + 10 || sy < -10 || sy > SIZE + 10) return null

          // Scale building dimensions to minimap
          const bw = Math.max(2, building.width / RANGE * (SIZE / 2) * 0.8)
          const bh = Math.max(2, building.depth / RANGE * (SIZE / 2) * 0.8)

          return (
            <rect
              key={`bld-${i}`}
              x={sx - bw / 2}
              y={sy - bh / 2}
              width={bw}
              height={bh}
              fill="var(--color-surface-alt)"
              stroke="var(--color-border)"
              strokeWidth={0.5}
            />
          )
        })}

        {/* NPCs with actual positions from store */}
        {npcs.map((npc) => {
          const dx = (npc.position[0] - playerPosition[0]) / RANGE * (SIZE / 2)
          const dy = (npc.position[2] - playerPosition[2]) / RANGE * (SIZE / 2)
          const sx = CENTER - dx
          const sy = CENTER - dy
          if (Math.abs(sx - CENTER) > CENTER || Math.abs(sy - CENTER) > CENTER) return null
          return (
            <circle key={npc.id} cx={sx} cy={sy} r={1.5} fill="var(--color-muted)" opacity={0.7} />
          )
        })}

        {/* Player */}
        <circle cx={CENTER} cy={CENTER} r={4} fill="var(--color-cyan)" className="player-blip" />
        <circle cx={CENTER} cy={CENTER} r={7} fill="none" stroke="var(--color-cyan)" strokeWidth={1} opacity={0.5} className="player-ping" />
        <circle cx={CENTER} cy={CENTER} r={1} fill="white" />
      </svg>
      <div className="minimap-scale">
        <span>100m</span>
      </div>
    </div>
  )
}