import { useGameStore } from '../game/store'
import { CITIES, VEHICLES } from '../game/constants'
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
  const isFalling = useGameStore((s) => s.isFalling)
  const npcs = useGameStore((s) => s.npcs)

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
        <Minimap playerPosition={coords} npcs={npcs} />
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

      {/* Vehicle indicator + speedometer */}
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

interface MinimapProps {
  playerPosition: [number, number, number]
  npcs: import('../game/types').NPC[]
}

function Minimap({ playerPosition, npcs }: MinimapProps) {
  const RANGE = 100
  const SIZE = 180
  const CENTER = SIZE / 2

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

        {/* NPCs as small white dots */}
        {npcs.slice(0, 20).map((npc) => {
          const dx = (npc.position[0] - playerPosition[0]) / RANGE * (SIZE / 2)
          const dy = (npc.position[2] - playerPosition[2]) / RANGE * (SIZE / 2)
          const sx = CENTER - dx
          const sy = CENTER - dy
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
