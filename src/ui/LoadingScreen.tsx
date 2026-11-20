// @jt886
import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { useGameStore } from '../game/store'
import { useLandscapeData } from '../game/LandscapeContext'
import './LoadingScreen.css' // @jiahe

const TIPS = [
  { text: 'DID YOU KNOW? San Francisco has more hills than a dirt staircase.', category: 'DID YOU KNOW' },
  { text: 'TIP: Press F to enter a vehicle. Or just punch it. That works too.', category: 'TIP' },
  { text: 'CALTRAIN: Still slower than walking a boat across the bay.', category: 'TRANSIT FACT' },
  { text: 'TIP: Shift to run. Walking is for Cobblestone.', category: 'TIP' },
  { text: 'The Bay Bridge is always under construction. Even in this game.', category: 'FUN FACT' },
  { text: 'Press SPACE to jump. We don\'t ask why. Just do it.', category: 'TIP' },
  { text: 'This game contains zero NFTs. You\'re welcome.', category: 'DISCLAIMER' },
  { text: 'TIP: Your character respawns. Unlike your patience.', category: 'TIP' },
  { text: 'WASD to move. No horses, no villagers, no diamond swords.', category: 'CONTROLS' },
  { text: 'The NPCs are not just wandering. They\'re fleeing in terror.', category: 'BUG REPORT' },
  { text: 'TIP: Night mode. Now with 100% more visibility issues.', category: 'TIP' },
  { text: 'Founder Simulator is an original game. Any resemblance to your actual startup is coincidental.', category: 'LEGAL' },
  { text: 'STORY MODE: every objective is a real downtown building, pulled from OpenStreetMap.', category: 'DID YOU KNOW' },
  { text: 'TIP: Press F near a highlighted person to talk. Number keys pick your answer.', category: 'TIP' },
]

const PROGRESS_MESSAGES = [
  'Generating world...',
  'Placing grass blocks...',
  'Spawning NPCs with no pathfinding...',
  'Attaching vehicle mod to cybertruck...',
  'Warming up the GPU like a furnace...',
  'Simulating San Francisco traffic...',
  'Adding street lamps for ambience...',
  'Loading Caltrain delays...',
  'Crafting loading bar...',
  'Placing wrong kind of trees...',
  'Importing San Francisco skyline...',
  'Configuring NPC AI (they\'re scared of you)...',
  'Building suspension bridges...',
  'Spawning more vehicles than SF has parking spots...',
]

function PixelBlock({ w, h }: { w: number; h: number }) {
  return <div className="ls-block ls-block-accent" style={{ width: w, height: h }} />
}

export default function LoadingScreen() {
  const [baseline, setBaseline] = useState(0)
  const [tipIndex, setTipIndex] = useState(Math.floor(Math.random() * TIPS.length))
  const [msgIndex, setMsgIndex] = useState(0)
  const isLoading = useGameStore((s) => s.isLoading)

  // Real loader progress from three.js's DefaultLoadingManager — drei's
  // useGLTF, useTexture, etc. all route through it, so this tracks the GLB
  // byte stream for the scan map.
  const { progress: realProgress, active, loaded, total, item } = useProgress()
  const assetSeen = useRef(false)
  if (active) assetSeen.current = true

  // Is there a GLB coming for this map at all? If yes, we gate dismissal on
  // the real loader finishing (active=false AND we saw at least one load).
  const data = useLandscapeData()
  const expectsGlb = !!data.objModel

  useEffect(() => {
    if (!isLoading) return

    // Reset per-cycle state so switching maps doesn't inherit the previous
    // session's progress or "already loaded" flag.
    setBaseline(0)
    setMsgIndex(0)
    assetSeen.current = false

    // Baseline animation — 4s from 0→100, mostly for cosmetic continuity.
    // When a real asset is loading we cap at whichever is smaller so the
    // number only moves forward and never overstates progress.
    const steps = 100
    let step = 0
    const interval = setInterval(() => {
      step++
      setBaseline(Math.min(step, steps))
      setMsgIndex(Math.floor((step / steps) * PROGRESS_MESSAGES.length))
    }, 40)

    const tipInterval = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length)
    }, 3500)

    return () => {
      clearInterval(interval)
      clearInterval(tipInterval)
    }
  }, [isLoading])

  // Dismiss when baseline + (real loader, if any) are done.
  useEffect(() => {
    if (!isLoading) return
    const baselineDone = baseline >= 100
    const glbDone = expectsGlb ? (assetSeen.current && !active) : true
    if (baselineDone && glbDone) {
      const t = setTimeout(() => useGameStore.getState().setIsLoading(false), 400)
      return () => clearTimeout(t)
    }
  }, [isLoading, baseline, active, expectsGlb])

  if (!isLoading) return null

  // Display: if the GLB is currently loading, show real progress so the 148 MB
  // download feels honest. Otherwise show the baseline. Always monotonic.
  const displayProgress = active
    ? Math.min(Math.max(realProgress, baseline), 99)
    : Math.max(baseline, assetSeen.current ? 100 : baseline)

  const sizeMb = total > 0 ? (loaded / 1024 / 1024).toFixed(1) : null
  const totalMb = total > 0 ? (total / 1024 / 1024).toFixed(1) : null

  const tip = TIPS[tipIndex]

  return (
    <div className="ls-backdrop">
      <div className="ls-pixel-grid" />
      <div className="ls-vignette" />
      <div className="ls-scanline" />

      <div className="ls-container">
        {/* Wordmark */}
        <div className="ls-logo-wrap">
          <div className="ls-wordmark">
            <span>Founder</span>
            <span className="ls-wordmark-accent">Simulator</span>
          </div>

          <div className="ls-subtitle">SAN FRANCISCO · STORY MODE</div>

          {/* Minecraft grass/dirt divider */}
          <div className="ls-divider">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="ls-divider-col">
                <div className="ls-grass" />
                <div className="ls-dirt" />
                <div className="ls-dirt" />
                <div className="ls-dirt" />
              </div>
            ))}
          </div>
        </div>

        {/* Welcome message */}
        <div className="ls-welcome">
          <h2 className="ls-welcome-title">Welcome to the Bay Area Founder Simulator 😂</h2>
          <p className="ls-welcome-body">
            Inspired by "vibe coding" and way too much ambition, this is a mini open-world game where you try to build a startup from scratch.
          </p>
          <p className="ls-welcome-tagline">Network. Pitch. Coffee chat. Climb. Party. Repeat.</p>
          <p className="ls-welcome-footer">Not a crime sim — but it might be the closest thing to founder life.</p>
        </div>

        {/* Progress */}
        <div className="ls-progress-wrap">
          <div className="ls-spinner">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="ls-spinner-pixel"
                style={{
                  animationDelay: `${i * 80}ms`,
                  backgroundColor: 'var(--accent)',
                }}
              />
            ))}
          </div>

          <div className="ls-progress-track">
            <div className="ls-progress-fill" style={{ width: `${displayProgress}%` }} />
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="ls-progress-notch" style={{ left: `${((i + 1) / 10) * 100}%` }} />
            ))}
          </div>

          <div className="ls-progress-text">
            <span className="ls-progress-pct">{Math.floor(displayProgress)}%</span>
            <span className="ls-progress-msg">
              {active && sizeMb && totalMb
                ? `Downloading ${item.split('/').pop() || 'assets'} — ${sizeMb} / ${totalMb} MB`
                : PROGRESS_MESSAGES[Math.min(msgIndex, PROGRESS_MESSAGES.length - 1)]}
            </span>
          </div>
        </div>

        {/* Tip */}
        <div className="ls-tip-wrap">
          <div className="ls-tip-header">
            <div className="ls-pixel-icon">
              {Array.from({ length: 9 }, (_, i) => (
                <PixelBlock key={i} w={4} h={4} />
              ))}
            </div>
            <span className="ls-tip-category">{tip.category}</span>
          </div>
          <div className="ls-tip-text">{tip.text}</div>
        </div>

        {/* Footer */}
        <div className="ls-footer">
          <span className="ls-footer-left">FOUNDER SIMULATOR</span>
          <span className="ls-footer-center">MAP © OPENSTREETMAP CONTRIBUTORS · CHARACTERS &amp; CARS BY KENNEY (CC0)</span>
          <span className="ls-footer-right">v1.0-SF</span>
        </div>

        <div className="ls-corner ls-corner-tl" />
        <div className="ls-corner ls-corner-tr" />
        <div className="ls-corner ls-corner-bl" />
        <div className="ls-corner ls-corner-br" />
      </div>
    </div>
  )
}