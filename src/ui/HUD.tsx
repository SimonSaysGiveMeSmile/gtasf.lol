// @jt886
import { useState } from 'react'
import { useGameStore } from '../game/store'
import { CITIES, VEHICLES } from '../game/constants'
import type { CityId } from '../game/types'
import { LANDSCAPE_CONFIG } from '../game/landscape'
import './HUD.css' // @jt886

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
          <circle key={`grid-${i}`} cx={CENTER} cy={CENTER} r={(i / 5) * (SIZE / 2)} fill="none" stroke="var(--minimap-stroke)" strokeWidth={0.5} />
        ))}
        {/* Cardinal lines */}
        <line x1={CENTER} y1={0} x2={CENTER} y2={SIZE} stroke="var(--minimap-stroke)" strokeWidth={0.3} />
        <line x1={0} y1={CENTER} x2={SIZE} y2={CENTER} stroke="var(--minimap-stroke)" strokeWidth={0.3} />

        {/* Roads from spline paths */}
        {LANDSCAPE_CONFIG.roadPaths.map((path, pi) =>
          path.map((pt, i) => {
            const dx = (pt.x - playerPosition[0]) * MAP_SCALE
            const dy = (pt.z - playerPosition[2]) * MAP_SCALE
            const sx = CENTER - dx * cosR + dy * sinR
            const sy = CENTER - dx * sinR - dy * cosR
            if (Math.abs(sx - CENTER) > CENTER || Math.abs(sy - CENTER) > CENTER) return null
            return <circle key={`road-${pi}-${i}`} cx={sx} cy={sy} r={1.5} fill="rgba(80,80,80,0.6)" />
          })
        )}

        {/* Caltrain rail tracks */}
        {LANDSCAPE_CONFIG.caltransPaths.map((path, pi) =>
          path.map((pt, i) => {
            const dx = (pt.x - playerPosition[0]) * MAP_SCALE
            const dy = (pt.z - playerPosition[2]) * MAP_SCALE
            const sx = CENTER - dx * cosR + dy * sinR
            const sy = CENTER - dx * sinR - dy * cosR
            if (Math.abs(sx - CENTER) > CENTER || Math.abs(sy - CENTER) > CENTER) return null
            return <circle key={`rail-${pi}-${i}`} cx={sx} cy={sy} r={1.2} fill="rgba(255,140,0,0.6)" />
          })
        )}

        {/* Trees as small green dots */}
        {LANDSCAPE_CONFIG.trees.map((t, i) => {
          const dx = (t.x - playerPosition[0]) * MAP_SCALE
          const dy = (t.z - playerPosition[2]) * MAP_SCALE
          const sx = CENTER - dx * cosR + dy * sinR
          const sy = CENTER - dx * sinR - dy * cosR
          if (Math.abs(sx - CENTER) > CENTER || Math.abs(sy - CENTER) > CENTER) return null
          return <circle key={`tree-${i}`} cx={sx} cy={sy} r={1} fill="rgba(40,140,40,0.5)" />
        })}

        {/* Street lamps as small yellow dots */}
        {LANDSCAPE_CONFIG.streetLamps.map((l, i) => {
          const dx = (l.x - playerPosition[0]) * MAP_SCALE
          const dy = (l.z - playerPosition[2]) * MAP_SCALE
          const sx = CENTER - dx * cosR + dy * sinR
          const sy = CENTER - dx * sinR - dy * cosR
          if (Math.abs(sx - CENTER) > CENTER || Math.abs(sy - CENTER) > CENTER) return null
          return <circle key={`lamp-${i}`} cx={sx} cy={sy} r={1.2} fill="rgba(255,200,50,0.6)" />
        })}

        {/* Water body */}
        {(() => {
          const w = LANDSCAPE_CONFIG.water
          const wx = (w.x - playerPosition[0]) * MAP_SCALE
          const wy = (w.z - playerPosition[2]) * MAP_SCALE
          const wW = w.width * MAP_SCALE
          const wH = w.height * MAP_SCALE
          const rx = CENTER - wx + wW / 2
          const ry = CENTER - wy + wH / 2
          return <rect x={rx - wW / 2} y={ry - wH / 2} width={wW} height={wH} fill="rgba(0,100,200,0.2)" stroke="rgba(0,150,255,0.3)" strokeWidth={0.5} />
        })()}

        {/* Buildings as small rectangles */}
        {LANDSCAPE_CONFIG.buildings.slice(0, 80).map((b, i) => {
          const dx = (b.x - playerPosition[0]) * MAP_SCALE
          const dy = (b.z - playerPosition[2]) * MAP_SCALE
          const sx = CENTER - dx * cosR + dy * sinR
          const sy = CENTER - dx * sinR - dy * cosR
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
              fill="rgba(0, 113, 227, 0.12)"
              stroke="rgba(0, 113, 227, 0.2)"
              strokeWidth={0.3}
            />
          )
        })}

        {/* Player indicator — triangle arrow */}
        <polygon
          points={`${CENTER},${CENTER - 6} ${CENTER - 4},${CENTER + 4} ${CENTER + 4},${CENTER + 4}`}
          fill="var(--minimap-accent)"
          opacity="0.9"
        />

        {/* NPCs as small white dots */}
        {npcs.slice(0, 20).map((npc) => {
          const dx = (npc.position[0] - playerPosition[0]) * MAP_SCALE
          const dy = (npc.position[2] - playerPosition[2]) * MAP_SCALE
          const sx = CENTER - dx * cosR + dy * sinR
          const sy = CENTER - dx * sinR - dy * cosR
          if (Math.abs(sx - CENTER) > CENTER || Math.abs(sy - CENTER) > CENTER) return null
          return <circle key={npc.id} cx={sx} cy={sy} r={1.5} fill="rgba(255,255,255,0.4)" />
        })}
      </svg>
      <div className="minimap-scale">
        <span>100m</span>
      </div>
    </div>
  )
}

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
  const qualityPreset = useGameStore((s) => s.qualityPreset)
  const setQualityPreset = useGameStore((s) => s.setQualityPreset)
  const vehicleSpeed = useGameStore((s) => s.vehicleSpeed)
  const currentVehicleType = useGameStore((s) => s.currentVehicleType)
  const vehicleName = currentVehicleType ? (VEHICLES.find(v => v.type === currentVehicleType)?.name || 'VEHICLE') : 'VEHICLE'
  const isFalling = useGameStore((s) => s.isFalling)
  const npcs = useGameStore((s) => s.npcs)
  const playerRotation = useGameStore((s) => s.playerRotation)
  const fps = useGameStore((s) => s.fps)
  const [showMenu, setShowMenu] = useState(false)
  const [showCoords, setShowCoords] = useState(true)
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const speedPercent = Math.min(100, (vehicleSpeed / 200) * 100)

  // @jiahe
  const masterVolume = useGameStore((s) => s.masterVolume)
  const sfxVolume = useGameStore((s) => s.sfxVolume)
  const ambientVolume = useGameStore((s) => s.ambientVolume)
  const setMasterVolume = useGameStore((s) => s.setMasterVolume)
  const setSfxVolume = useGameStore((s) => s.setSfxVolume)
  const setAmbientVolume = useGameStore((s) => s.setAmbientVolume)

  const healthColor =
    health > 50 ? 'var(--accent-green)' : health > 25 ? 'var(--accent-amber)' : 'var(--accent-red)'

  const healthSegments = Array.from({ length: 10 }, (_, i) => {
    const threshold = (i + 1) * 10
    return health >= threshold
  })

  const fpsColor = fps > 55 ? 'var(--accent-green)' : fps > 30 ? 'var(--accent-amber)' : 'var(--accent-red)'

  return (
    <>
      {/* FPS counter — top right */}
      <div className="fps-counter">
        <span className="fps-value" style={{ color: fpsColor }}>{fps}</span>
        <span className="fps-label">FPS</span>
      </div>

      {/* Top bar */}
      <div className="hud-topbar">
        <button className="menu-button" onClick={() => setShowMenu(!showMenu)} aria-label="Menu">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
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
                  <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
              <label className="settings-label">QUALITY</label>
              <select
                value={qualityPreset}
                onChange={(e) => setQualityPreset(e.target.value as typeof qualityPreset)}
                className="settings-select"
              >
                <option value="low">Low (720p)</option>
                <option value="med">Med (1080p)</option>
                <option value="high">High (1440p)</option>
                <option value="ultra">Ultra (4K)</option>
                <option value="8k">8K (may crash)</option>
              </select>
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
              <span className="credits-text">@realsimontian 2026</span>
              <a
                href="https://github.com/SimonSaysGiveMeSmile/gtasf.lol"
                target="_blank"
                rel="noopener noreferrer"
                className="credits-link"
              >
                github.com/realsimontian/gtasf.lol
              </a>
            </div>
            <div className="settings-divider" />
            {/* Volume controls */}
            <div className="settings-section">
              <label className="settings-label">MASTER</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={masterVolume}
                onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                className="settings-slider"
              />
              <span className="settings-value">{Math.round(masterVolume * 100)}%</span>
            </div>
            <div className="settings-section">
              <label className="settings-label">SFX</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={sfxVolume}
                onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                className="settings-slider"
              />
              <span className="settings-value">{Math.round(sfxVolume * 100)}%</span>
            </div>
            <div className="settings-section">
              <label className="settings-label">AMBIENT</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={ambientVolume}
                onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                className="settings-slider"
              />
              <span className="settings-value">{Math.round(ambientVolume * 100)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Health bar */}
      <div className={`health-container ${isTouchDevice ? 'hud-topright' : ''}`}>
        <div className="health-label">
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 1 }}>
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

      {/* Minimap */}
      <div className={`minimap-container ${isTouchDevice ? 'hud-topright-minimap' : ''}`}>
        <div className="minimap-header">
          <span className="minimap-title">RADAR</span>
        </div>
        <Minimap playerPosition={coords} npcs={npcs} playerRotation={playerRotation} />
        <div className="minimap-corners" />
      </div>

      {/* Vehicle speedometer */}
      {inVehicle && (
        <div className="vehicle-indicator">
          <div className="vehicle-name-row">
            <span className="vehicle-name">{vehicleName}</span>
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
          <div className="interact-key">F</div>
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
            <path d="M7 1L7 10M7 10L4 7M7 10L10 7" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12H12" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="falling-text">FALLING</span>
        </div>
      )}
    </>
  )
}