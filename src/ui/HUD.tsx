import { useGameStore } from '../game/store'
import { CITIES, VEHICLES } from '../game/constants'
import type { CityId } from '../game/types'
import './HUD.css'

export default function HUD() {
  const health = useGameStore((s) => s.playerHealth)
  const coords = useGameStore((s) => s.playerPosition)
  const city = useGameStore((s) => s.currentCity)
  const inVehicle = useGameStore((s) => s.inVehicle)
  const playerMode = useGameStore((s) => s.playerMode)
  const interactionPrompt = useGameStore((s) => s.interactionPrompt)
  const damageFlash = useGameStore((s) => s.damageFlash)
  const isDead = useGameStore((s) => s.isDead)
  const isRespawning = useGameStore((s) => s.isRespawning)
  const setCity = useGameStore((s) => s.setCity)
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const setTimeOfDay = useGameStore((s) => s.setTimeOfDay)

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
          <div className="vehicle-icon">
            {VEHICLES.find((v) => v.type === playerMode) ? (
              <span className="vehicle-name">
                {VEHICLES.find((v) => v.type === playerMode)?.name}
              </span>
            ) : (
              <span className="vehicle-name">VEHICLE</span>
            )}
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

  return (
    <div className="minimap-view">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Background grid */}
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} cx={SIZE / 2} cy={SIZE / 2} r={(i / 5) * (SIZE / 2)} fill="none" stroke="var(--color-border)" strokeWidth={0.5} />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1={SIZE / 2} y1={i * SIZE / 4} x2={SIZE} y2={SIZE / 2} stroke="var(--color-border)" strokeWidth={0.3} />
        ))}

        {/* Buildings */}
        {Array.from({ length: 15 }, (_, i) => {
          const angle = (i / 15) * Math.PI * 2
          const dist = 20 + (i % 5) * 15
          const sx = SIZE / 2 + Math.cos(angle) * dist
          const sy = SIZE / 2 + Math.sin(angle) * dist
          return (
            <rect key={i} x={sx - 3} y={sy - 3} width={6} height={6} fill="var(--color-surface-alt)" stroke="var(--color-border)" strokeWidth={0.5} />
          )
        })}

        {/* Water */}
        <path
          d={`M 0 ${SIZE * 0.75} Q ${SIZE * 0.3} ${SIZE * 0.6} ${SIZE * 0.5} ${SIZE * 0.8} Q ${SIZE * 0.7} ${SIZE * 0.9} ${SIZE} ${SIZE * 0.7} L ${SIZE} ${SIZE} L 0 ${SIZE} Z`}
          fill="rgba(0, 30, 60, 0.6)"
        />

        {/* NPCs */}
        {npcs.filter(n => n.type === 'pedestrian').slice(0, 15).map((npc) => {
          const dx = (npc.position[0] - playerPosition[0]) / RANGE * (SIZE / 2)
          const dy = (npc.position[2] - playerPosition[2]) / RANGE * (SIZE / 2)
          const sx = SIZE / 2 - dx
          const sy = SIZE / 2 - dy
          if (Math.abs(sx - SIZE / 2) > SIZE / 2 || Math.abs(sy - SIZE / 2) > SIZE / 2) return null
          return (
            <circle key={npc.id} cx={sx} cy={sy} r={1.5} fill="var(--color-muted)" opacity={0.7} />
          )
        })}

        {/* Player */}
        <circle cx={SIZE / 2} cy={SIZE / 2} r={4} fill="var(--color-cyan)" className="player-blip" />
        <circle cx={SIZE / 2} cy={SIZE / 2} r={7} fill="none" stroke="var(--color-cyan)" strokeWidth={1} opacity={0.5} className="player-ping" />
        <circle cx={SIZE / 2} cy={SIZE / 2} r={1} fill="white" />
      </svg>
      <div className="minimap-scale">
        <span>100m</span>
      </div>
    </div>
  )
}