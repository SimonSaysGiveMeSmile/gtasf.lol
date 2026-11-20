// Story mode — DOM overlays: title screen, chapter cards, dialogue, the
// objective panel, toasts and the ending.
import { useEffect, useMemo } from 'react'
import { useGameStore } from '../game/store'
import { useStoryStore, fmtStory, formatMoney } from './storyStore'
import { CHAPTERS } from './chapters'
import type { StatDelta } from './types'
import './story.css'

const isTouch = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0

export default function StoryUI() {
  const isLoading = useGameStore((s) => s.isLoading)
  const screen = useStoryStore((s) => s.screen)
  const mode = useStoryStore((s) => s.mode)
  const dialogue = useStoryStore((s) => s.dialogue)
  const card = useStoryStore((s) => s.card)
  const toast = useStoryStore((s) => s.toast)

  // Keyboard: advance / choose. Digits pick choices; Space/Enter/F advance.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStoryStore.getState()
      if (!s.dialogue) return
      const line = s.dialogue.lines[s.dialogue.index]
      if (line?.choices?.length) {
        const n = parseInt(e.key, 10)
        if (n >= 1 && n <= line.choices.length) { e.preventDefault(); s.choose(n - 1) }
        return
      }
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyF' || e.code === 'KeyE') {
        e.preventDefault()
        s.nextLine()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (isLoading) return null

  return (
    <>
      {screen === 'title' && <TitleScreen />}
      {screen === 'ending' && <EndingScreen />}
      {screen === 'none' && mode === 'story' && <ObjectivePanel />}
      {screen === 'none' && mode === 'story' && <TalkPrompt />}
      {card && screen === 'none' && (
        <div className="sc-card">
          <div className="sc-card-inner" key={card.title + card.subtitle}>
            <div className="sc-card-title">{card.title}</div>
            {card.subtitle && <div className="sc-card-sub">{card.subtitle}</div>}
            <div className="sc-card-rule" />
          </div>
        </div>
      )}
      {dialogue && screen === 'none' && <DialogueBox />}
      {toast && screen === 'none' && <div className="so-toast">{fmtStory(toast.text)}</div>}
    </>
  )
}

// ─── Title ───────────────────────────────────────────────────────────────────
function TitleScreen() {
  const hasSave = useStoryStore((s) => s.hasSave)
  const startNewStory = useStoryStore((s) => s.startNewStory)
  const continueStory = useStoryStore((s) => s.continueStory)
  const freeRoam = useStoryStore((s) => s.freeRoam)
  const touch = isTouch()
  return (
    <div className="ts-root">
      <div className="ts-left">
        <div>
          <div className="ts-kicker">An open-world startup sim · San Francisco</div>
          <h1 className="ts-title">Founder<em>Simulator</em></h1>
        </div>
        <p className="ts-sub">
          Laid off on a Tuesday with $4,200 and a napkin. Build a company from a Tenderloin SRO to a bell on Pine Street —
          across the real streets of downtown San Francisco.
        </p>
        <div className="ts-buttons">
          {hasSave && (
            <button className="ts-btn primary" onClick={continueStory}>
              Continue story <small>resume your chapter</small>
            </button>
          )}
          <button className={`ts-btn ${hasSave ? '' : 'primary'}`} onClick={startNewStory}>
            New story <small>9 chapters · ~40 min</small>
          </button>
          <button className="ts-btn" onClick={freeRoam}>
            Free roam <small>drive, explore, take side gigs</small>
          </button>
        </div>
        <div className="ts-foot">
          {touch
            ? <><b>Joystick</b> move · <b>RUN</b> · <b>JUMP</b> · <b>F</b> talk / enter car · drag to look</>
            : <><b>WASD</b> move · <b>SHIFT</b> run · <b>SPACE</b> jump · <b>F</b> talk / enter car · drag mouse to look</>}
          <br />
          Map data © OpenStreetMap contributors · Characters &amp; vehicles by Kenney (CC0)
        </div>
      </div>
    </div>
  )
}

// ─── Objective panel ─────────────────────────────────────────────────────────
function ObjectivePanel() {
  const chapterIdx = useStoryStore((s) => s.chapter)
  const stepIdx = useStoryStore((s) => s.step)
  const waypoint = useStoryStore((s) => s.waypoint)
  const timer = useStoryStore((s) => s.timer)
  const stats = useStoryStore((s) => s.stats)
  const collect = useStoryStore((s) => s.collect)
  const deliverIdx = useStoryStore((s) => s.deliverIdx)
  const flags = useStoryStore((s) => s.flags)
  const playerPos = useGameStore((s) => s.playerPosition)

  const chapter = CHAPTERS[chapterIdx]
  const step = chapter?.steps[stepIdx]
  if (!chapter || !step) return null
  if (!('label' in step)) return null

  const dist = waypoint ? Math.round(Math.hypot(waypoint.x - playerPos[0], waypoint.z - playerPos[2])) : null
  const low = timer ? timer.remaining < 20 : false
  const hint = 'hint' in step ? step.hint : undefined
  let progress: string | null = null
  if (step.kind === 'collect' && collect) progress = `${collect.filter((c) => c.taken).length}/${step.count} ${step.itemLabel}s`
  if (step.kind === 'deliver') progress = `stop ${deliverIdx + 1}/${step.stops.length}`

  return (
    <div className="so-panel">
      <div className="so-chapter">{chapter.title} · {chapter.subtitle}</div>
      <div className="so-label">{fmtStory(step.label)}</div>
      {hint && <div className="so-hint">{hint}</div>}
      <div className="so-meta">
        <span>{dist !== null ? `${dist} m` : ''}{progress ? `  ·  ${progress}` : ''}</span>
        {timer && <span className={`so-timer ${low ? 'low' : ''}`}>{fmtTime(timer.remaining)}</span>}
      </div>
      {timer && (
        <div className={`so-timer-bar ${low ? 'low' : ''}`}>
          <div style={{ width: `${(timer.remaining / timer.total) * 100}%` }} />
        </div>
      )}
      <div className="so-stats">
        <div className="so-stat"><b>{formatMoney(stats.cash)}</b><span>cash</span></div>
        <div className="so-stat"><b>{formatMoney(stats.mrr)}</b><span>MRR</span></div>
        <div className="so-stat"><b>{Math.round(stats.hype)}</b><span>hype</span></div>
        <div className="so-stat"><b>{stats.team}</b><span>team</span></div>
      </div>
      {flags.company && <div className="so-company">{String(flags.company)} · you own {stats.equity.toFixed(1)}%</div>}
    </div>
  )
}

function TalkPrompt() {
  const nearTalk = useStoryStore((s) => s.nearTalk)
  const dialogue = useStoryStore((s) => s.dialogue)
  const talkTarget = useStoryStore((s) => s.talkTarget)
  if (!nearTalk || dialogue || !talkTarget) return null
  return (
    <div className="so-talk">
      <span className="so-key">F</span>
      <span>Talk to {talkTarget.name.split(' · ')[0]}</span>
    </div>
  )
}

// ─── Dialogue ────────────────────────────────────────────────────────────────
function DialogueBox() {
  const dialogue = useStoryStore((s) => s.dialogue)
  const nextLine = useStoryStore((s) => s.nextLine)
  const choose = useStoryStore((s) => s.choose)
  const line = dialogue ? dialogue.lines[dialogue.index] : null
  const touch = useMemo(() => isTouch(), [])
  if (!dialogue || !line) return null
  const isYou = line.speaker === 'You'
  return (
    <div className="sd-root" onClick={() => { if (!line.choices?.length) nextLine() }}>
      <div className="sd-box">
        <div className={`sd-speaker ${isYou ? 'you' : ''}`}>{line.speaker}</div>
        <div className="sd-text">{fmtStory(line.text)}</div>
        {line.choices?.length ? (
          <div className="sd-choices">
            {line.choices.map((c, i) => (
              <button key={i} className="sd-choice" onClick={(e) => { e.stopPropagation(); choose(i) }}>
                <span className="so-key">{i + 1}</span>
                <span>{fmtStory(c.label)}</span>
                {c.effect && <span className="sd-choice-effect">{fmtDelta(c.effect)}</span>}
              </button>
            ))}
          </div>
        ) : (
          <div className="sd-continue">
            {!touch && <span>SPACE</span>}
            <button onClick={(e) => { e.stopPropagation(); nextLine() }}>Continue ▸</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Ending ──────────────────────────────────────────────────────────────────
function EndingScreen() {
  const ending = useStoryStore((s) => s.ending)
  const stats = useStoryStore((s) => s.stats)
  const flags = useStoryStore((s) => s.flags)
  const freeRoam = useStoryStore((s) => s.freeRoam)
  const startNewStory = useStoryStore((s) => s.startNewStory)
  if (!ending) return null
  return (
    <div className="se-root">
      <div className="se-card">
        <div className="se-kicker">{String(flags.company ?? 'Your company')} · opening bell</div>
        <div className="se-rank">{ending.rank}</div>
        <p className="se-blurb">{ending.blurb}</p>
        <div className="se-grid">
          <div className="se-stat"><b>{formatMoney(ending.valuation)}</b><span>valuation</span></div>
          <div className="se-stat"><b>{formatMoney(ending.founderNetWorth)}</b><span>your stake</span></div>
          <div className="se-stat"><b>{stats.equity.toFixed(1)}%</b><span>ownership</span></div>
          <div className="se-stat"><b>{formatMoney(stats.mrr * 12)}</b><span>ARR</span></div>
          <div className="se-stat"><b>{stats.team}</b><span>employees</span></div>
          <div className="se-stat"><b>{Math.round(stats.hype)}</b><span>hype</span></div>
        </div>
        <div className="se-buttons">
          <button className="ts-btn primary" onClick={freeRoam}>Free roam the city</button>
          <button className="ts-btn" onClick={startNewStory}>Play again</button>
        </div>
      </div>
    </div>
  )
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.max(0, Math.ceil(s % 60))
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function fmtDelta(d: StatDelta): string {
  const parts: string[] = []
  if (d.cash) parts.push(`${d.cash > 0 ? '+' : '−'}${formatMoney(Math.abs(d.cash)).replace('$', '$')}`)
  if (d.equity) parts.push(`${d.equity > 0 ? '+' : '−'}${Math.abs(d.equity)}% eq`)
  if (d.hype) parts.push(`${d.hype > 0 ? '+' : '−'}${Math.abs(d.hype)} hype`)
  if (d.mrr) parts.push(`+${formatMoney(d.mrr)} MRR`)
  if (d.team) parts.push(`+${d.team} team`)
  return parts.join(' · ')
}
