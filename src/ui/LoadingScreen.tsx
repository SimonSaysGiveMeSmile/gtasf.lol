// @jt886
import { useEffect, useState } from 'react'
import { useGameStore } from '../game/store'
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
  { text: 'GTA-SF is not affiliated with Rockstar Games or Mojang. Allegedly.', category: 'LEGAL' },
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

// 5x7 pixel letter definitions (1 = filled, 0 = empty)
const LETTERS: Record<string, number[][]> = {
  G: [
    [1,1,1],
    [1,0,0],
    [1,0,1],
    [1,1,1],
    [1,0,1],
    [1,0,1],
    [1,1,1],
  ],
  T: [
    [1,1,1],
    [0,1,0],
    [0,1,0],
    [0,1,0],
    [0,1,0],
    [0,1,0],
    [0,1,0],
  ],
  A: [
    [0,1,0],
    [1,0,1],
    [1,0,1],
    [1,1,1],
    [1,0,1],
    [1,0,1],
    [1,0,1],
  ],
  '-': [
    [0,0,0],
    [0,0,0],
    [0,0,0],
    [0,0,0],
    [0,0,0],
    [0,0,0],
    [0,0,0],
  ],
  S: [
    [1,1,1],
    [1,0,0],
    [1,0,0],
    [1,1,1],
    [0,0,1],
    [0,0,1],
    [1,1,1],
  ],
  F: [
    [1,1,1],
    [1,0,0],
    [1,0,0],
    [1,1,1],
    [1,0,0],
    [1,0,0],
    [1,0,0],
  ],
}

const LOGO_TEXT = 'GTA-SF'
const LOGO_SPLIT = LOGO_TEXT.indexOf('-')
const FIRST_PART = LOGO_TEXT.slice(0, LOGO_SPLIT)
const SECOND_PART = LOGO_TEXT.slice(LOGO_SPLIT + 1)

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0)
  const [tipIndex, setTipIndex] = useState(Math.floor(Math.random() * TIPS.length))
  const [msgIndex, setMsgIndex] = useState(0)
  const isLoading = useGameStore((s) => s.isLoading)

  useEffect(() => {
    if (!isLoading) return

    const steps = 100
    let step = 0
    const interval = setInterval(() => {
      step++
      setProgress(Math.min(step, steps))
      setMsgIndex(Math.floor((step / steps) * PROGRESS_MESSAGES.length))
      if (step >= steps) {
        clearInterval(interval)
        setTimeout(() => {
          useGameStore.getState().setIsLoading(false)
        }, 400)
      }
    }, 40)

    const tipInterval = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length)
    }, 3500)

    return () => {
      clearInterval(interval)
      clearInterval(tipInterval)
    }
  }, [isLoading])

  if (!isLoading) return null

  const tip = TIPS[tipIndex]
  const px = 5

  return (
    <div className="ls-backdrop">
      <div className="ls-pixel-grid" />
      <div className="ls-vignette" />
      <div className="ls-scanline" />

      <div className="ls-container">
        {/* Pixel logo */}
        <div className="ls-logo-wrap">
          <div className="ls-logo-grid">
            {/* Render each character as a column of pixel rows */}
            {FIRST_PART.split('').map((char, ci) => {
              const rows = LETTERS[char]
              return (
                <div key={ci} className="ls-char">
                  {rows.map((row, ri) =>
                    row.map((filled, bi) =>
                      filled ? (
                        <PixelBlock key={`${ci}-${ri}-${bi}`} w={px} h={px} />
                      ) : (
                        <div key={`${ci}-${ri}-${bi}`} style={{ width: px, height: px }} />
                      )
                    )
                  )}
                </div>
              )
            })}
            {/* The dash as a magenta block column */}
            <div className="ls-dash-block">
              {[0, 1, 2, 3, 4, 5, 6].map((r) => (
                <PixelBlock key={r} w={px * 2} h={px} />
              ))}
            </div>
            {SECOND_PART.split('').map((char, ci) => {
              const rows = LETTERS[char]
              return (
                <div key={ci} className="ls-char">
                  {rows.map((row, ri) =>
                    row.map((filled, bi) =>
                      filled ? (
                        <PixelBlock key={`s-${ci}-${ri}-${bi}`} w={px} h={px} />
                      ) : (
                        <div key={`s-${ci}-${ri}-${bi}`} style={{ width: px, height: px }} />
                      )
                    )
                  )}
                </div>
              )
            })}
          </div>

          <div className="ls-subtitle">SAN FRANCISCO EDITION</div>

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
          <p className="ls-welcome-footer">It's not GTA—but it might be the closest thing to founder life.</p>
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
            <div className="ls-progress-fill" style={{ width: `${progress}%` }} />
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="ls-progress-notch" style={{ left: `${((i + 1) / 10) * 100}%` }} />
            ))}
          </div>

          <div className="ls-progress-text">
            <span className="ls-progress-pct">{progress}%</span>
            <span className="ls-progress-msg">{PROGRESS_MESSAGES[msgIndex]}</span>
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
          <span className="ls-footer-left">GTA-SF</span>
          <span className="ls-footer-center">MOCKERY LOADING SCREEN — NOT AFFILIATED WITH ROCKSTAR OR MOJANG</span>
          <span className="ls-footer-right">v0.1.0-SF</span>
        </div>

        <div className="ls-corner ls-corner-tl" />
        <div className="ls-corner ls-corner-tr" />
        <div className="ls-corner ls-corner-bl" />
        <div className="ls-corner ls-corner-br" />
      </div>
    </div>
  )
}