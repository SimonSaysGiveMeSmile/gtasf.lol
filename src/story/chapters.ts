// Story mode — campaign content.
// Every location is a real downtown San Francisco building, taken from the
// OpenStreetMap labels baked into src/game/maps/downtown_sf.ts, so the story
// plays out on the actual street grid (Tenderloin → Union Square → SoMa →
// Financial District). Coordinates are building centroids; the runner snaps
// them to the nearest road point so every objective is reachable.
import type { Chapter, Loc, Stats } from './types'

// ─── Real places (OSM-derived world coords, metres) ──────────────────────────
export const PLACES = {
  jonesHotel:       { x: -729, z: -165 } as Loc,  // Jones Hotel, Tenderloin — your $900/mo room
  cableCarCoffee:   { x: -274, z: -337 } as Loc,  // Cable Car Coffee, Powell St
  powellStation:    { x: -148, z: -282 } as Loc,  // Powell Street Station
  digitalGarage:    { x: 114,  z: -69  } as Loc,  // Digital Garage, Mission St — the hacker house
  mosconeWest:      { x: 80,   z: -496 } as Loc,  // Moscone Center West — Demo Day
  montgomery44:     { x: 284,  z: 237  } as Loc,  // 44 Montgomery — Fogline Capital
  montgomery101:    { x: 221,  z: 319  } as Loc,  // 101 Montgomery — Bayshore Partners
  mckesson:         { x: 206,  z: 143  } as Loc,  // McKesson Plaza — Kite & Kelp Ventures
  oneMontgomery:    { x: 146,  z: 188  } as Loc,  // One Montgomery Tower — Series A
  metreon:          { x: 165,  z: -358 } as Loc,
  sfmoma:           { x: 385,  z: -174 } as Loc,
  grandHyatt:       { x: -197, z: 181  } as Loc,
  hotelNikko:       { x: -375, z: -189 } as Loc,
  galleriaPark:     { x: 131,  z: 234  } as Loc,
  unionSquare:      { x: -220, z: -56  } as Loc,
  hallidiePlaza:    { x: -334, z: -373 } as Loc,  // Powell & Market cable-car turnaround
  newMontgomery140: { x: 437,  z: -90  } as Loc,  // 140 New Montgomery — Clonely HQ
  pacificExchange:  { x: 326,  z: 482  } as Loc,  // Pacific Exchange Building, 301 Pine
  huntington:       { x: -623, z: 432  } as Loc,  // The Huntington, Nob Hill
}

export const INITIAL_STATS: Stats = {
  cash: 4200,
  hype: 5,
  team: 1,
  mrr: 0,
  equity: 100,
  day: 1,
}

export const COMPANY_NAMES = ['Quokka', 'Stackwise', 'Parallax Labs'] as const

const YOU = 'You'
const PRIYA = 'Priya'

export const CHAPTERS: Chapter[] = [
  // ── 0 ────────────────────────────────────────────────────────────────────
  {
    id: 'prologue',
    title: 'Prologue',
    subtitle: 'Severance',
    steps: [
      { kind: 'teleport', at: PLACES.jonesHotel },
      { kind: 'card', title: 'Prologue', subtitle: 'Severance — Tenderloin, Tuesday 7:40 AM' },
      {
        kind: 'dialogue',
        lines: [
          { speaker: 'HR (voicemail)', text: '"…so your role has been impacted. Your laptop will be remotely wiped at noon. We wish you the best in your next chapter."' },
          { speaker: YOU, text: 'Bank balance: $4,200. Rent on this room at the Jones Hotel: $900, due Friday. One idea, written on a napkin.' },
          { speaker: PRIYA, text: '(text) "Heard the news. I quit too. Cable Car Coffee on Powell, 20 min. Bring the napkin."' },
        ],
      },
      {
        kind: 'goto', id: 'p-coffee', at: PLACES.cableCarCoffee,
        label: 'Meet Priya at Cable Car Coffee',
        hint: 'Follow the beacon on the radar. SHIFT to run.',
      },
      {
        kind: 'talk', id: 'p-priya', at: PLACES.cableCarCoffee,
        label: 'Talk to Priya', hint: 'Walk up and press F',
        npc: { name: 'Priya', model: 'character-female-b' },
        lines: [
          { speaker: PRIYA, text: 'Okay. We have no jobs, no money, and a napkin. Perfect founding conditions. What are we building?' },
          {
            speaker: YOU, text: 'Hear me out…',
            choices: [
              { label: 'AI agents that answer your email so you never have to.', flag: 'idea', flagValue: 'agents', effect: { hype: 4 }, reply: 'Everyone is building that. Which means there is a market. I\'m in.' , replySpeaker: PRIYA },
              { label: 'Robotaxis, but for dogs.', flag: 'idea', flagValue: 'dogtaxi', effect: { hype: 8 }, reply: 'That is the dumbest thing I have ever heard. The TAM is enormous. I\'m in.', replySpeaker: PRIYA },
              { label: 'Spreadsheets, but fast.', flag: 'idea', flagValue: 'sheets', effect: { hype: 2, mrr: 200 }, reply: 'Boring. Boring makes money. I\'m in.', replySpeaker: PRIYA },
            ],
          },
          {
            speaker: PRIYA, text: 'We need a name before we need a product. Pick one, we\'re registering it tonight.',
            choices: [
              { label: 'Quokka', flag: 'company', flagValue: 'Quokka', reply: 'Quokka. Cute. Fundable.' },
              { label: 'Stackwise', flag: 'company', flagValue: 'Stackwise', reply: 'Stackwise. Sounds like it has an enterprise tier already.' },
              { label: 'Parallax Labs', flag: 'company', flagValue: 'Parallax Labs', reply: 'Parallax Labs. Mysterious. Investors love "Labs".' },
            ],
          },
          { speaker: PRIYA, text: 'Co-founders, 50/50. I know a hacker house on Mission Street with a free desk. Let\'s go build {company}.' },
        ],
      },
      { kind: 'effect', delta: { team: 1, equity: -50 }, toast: 'Priya joined as co-founder (50% equity)' },
    ],
  },

  // ── 1 ────────────────────────────────────────────────────────────────────
  {
    id: 'garage',
    title: 'Chapter 1',
    subtitle: 'Garage Days',
    steps: [
      { kind: 'card', title: 'Chapter 1', subtitle: 'Garage Days' },
      {
        kind: 'goto', id: 'c1-garage', at: PLACES.digitalGarage,
        label: 'Get to the hacker house on Mission St',
        hint: 'Digital Garage. Long walk — grab a car with F if you see one.',
      },
      {
        kind: 'talk', id: 'c1-rafa', at: PLACES.digitalGarage,
        label: 'Talk to Rafa, the house manager',
        npc: { name: 'Rafa', model: 'character-male-c' },
        lines: [
          { speaker: 'Rafa', text: 'Welcome to the Garage. Twelve startups, one bathroom, infinite cold brew. Desks are $1,500 a month… or we take equity.' },
          {
            speaker: YOU, text: 'Let\'s talk terms.',
            choices: [
              { label: 'Pay $1,500 cash.', effect: { cash: -1500 }, reply: 'Cash is king. Desk 7, by the window that doesn\'t open.' },
              { label: 'Offer 2% of {company}.', effect: { equity: -2 }, flag: 'rafaEquity', flagValue: true, reply: 'Two percent of a napkin. Sure, why not. Desk 7.' },
            ],
          },
          { speaker: 'Rafa', text: 'One more thing — your laptop gets wiped at noon, right? A guy named Dave sells "refurbished" GPU rigs outside Powell Station. Go now. House meeting in two minutes, don\'t be late.' },
        ],
      },
      {
        kind: 'talk', id: 'c1-dave', at: PLACES.powellStation,
        label: 'Find Sketchy Dave at Powell Station',
        npc: { name: 'Sketchy Dave', model: 'character-male-f' },
        lines: [
          { speaker: 'Sketchy Dave', text: 'Psst. RTX, barely used, fell off a truck — metaphorically. Nine hundred bucks.' },
          {
            speaker: YOU, text: 'Hmm.',
            choices: [
              { label: 'Pay $900. No questions.', effect: { cash: -900 }, reply: 'Pleasure. The fans scream a little. That\'s normal.' },
              { label: 'Haggle: "$600 and I don\'t ask about the serial number."', effect: { cash: -600, hype: -1 }, reply: '…Fine. You\'d make a good founder. Or a fence.' },
              { label: 'Walk away and dumpster-dive a monitor instead.', effect: { hype: 1 }, flag: 'frugal', flagValue: true, reply: 'Suit yourself. The Marriott throws out great monitors on Thursdays.' },
            ],
          },
        ],
      },
      {
        kind: 'goto', id: 'c1-back', at: PLACES.digitalGarage,
        label: 'Get the rig back to the Garage for the house meeting',
        timer: 130, failText: 'You missed the house meeting. Rafa reschedules — move faster this time.',
        hint: 'Timed! Steal — er, borrow — a car.',
      },
      {
        kind: 'dialogue',
        lines: [
          { speaker: PRIYA, text: 'You made it. I shipped the landing page while you were gone. We have a waitlist of eleven people. Nine are my cousins.' },
          { speaker: YOU, text: 'Eleven is a market. Now we need people who can actually code.' },
        ],
      },
      { kind: 'effect', delta: { hype: 5, day: 3 }, toast: 'Landing page live — 11 on the waitlist' },
    ],
  },

  // ── 2 ────────────────────────────────────────────────────────────────────
  {
    id: 'hackerhouse',
    title: 'Chapter 2',
    subtitle: 'The First Hires',
    steps: [
      { kind: 'card', title: 'Chapter 2', subtitle: 'The First Hires' },
      {
        kind: 'dialogue',
        lines: [
          { speaker: PRIYA, text: 'Three people replied to my "join a rocketship (pre-rocket)" post. They\'re scattered around Union Square. Go close them.' },
        ],
      },
      {
        kind: 'talk', id: 'c2-dev', at: PLACES.unionSquare,
        label: 'Recruit Dev (backend) at Union Square',
        npc: { name: 'Dev', model: 'character-male-d' },
        lines: [
          { speaker: 'Dev', text: 'I ran payments infra at a company you\'ve heard of. I\'m bored. What\'s the offer?' },
          {
            speaker: YOU, text: 'Here\'s the deal.',
            choices: [
              { label: '$6,000/mo salary, 0.5% equity.', effect: { cash: -6000, team: 1, equity: -0.5 }, reply: 'Market rate for a napkin. I\'ll take it.' },
              { label: 'No salary, 3% equity.', effect: { team: 1, equity: -3 }, reply: 'Ramen and upside. The founder special. Fine — but I pick the database.' },
            ],
          },
        ],
      },
      {
        kind: 'talk', id: 'c2-lena', at: PLACES.galleriaPark,
        label: 'Recruit Lena (design) at the Galleria Park Hotel',
        npc: { name: 'Lena', model: 'character-female-d' },
        lines: [
          { speaker: 'Lena', text: 'Your landing page hurt my eyes. I can fix that. I need either money or a very good reason.' },
          {
            speaker: YOU, text: 'Pitch time.',
            choices: [
              { label: '"We\'re going to be the default. Be our first designer." (1% equity)', effect: { team: 1, equity: -1, hype: 3 }, reply: 'Okay, that was a good reason. I\'m rebranding everything tonight.' },
              { label: '$4,000/mo contract.', effect: { cash: -4000, team: 1 }, reply: 'Deal. Invoice is already in your inbox.' },
            ],
          },
        ],
      },
      {
        kind: 'talk', id: 'c2-kenji', at: PLACES.grandHyatt,
        label: 'Recruit Kenji (growth) at the Grand Hyatt lobby',
        npc: { name: 'Kenji', model: 'character-male-e' },
        lines: [
          { speaker: 'Kenji', text: 'I grew a meme account to 2 million followers. I can make {company} a thing. Or a laughingstock. Usually both.' },
          {
            speaker: YOU, text: 'Terms?',
            choices: [
              { label: 'Hire him. 1.5% equity, no salary.', effect: { team: 1, equity: -1.5, hype: 6 }, reply: 'I\'m posting the announcement before you change your mind.' },
              { label: 'Pass — growth can wait.', effect: { hype: -2 }, reply: 'Your loss. I\'ll tweet about it. Lovingly.' },
            ],
          },
        ],
      },
      {
        kind: 'dialogue',
        lines: [
          { speaker: PRIYA, text: 'Team\'s assembled. Also — first paying customer. A dentist in Daly City. $800 a month. We are officially a business.' },
          { speaker: PRIYA, text: 'And there\'s a Demo Day at Moscone West on Thursday. I got us a slot. Don\'t be late. Don\'t be weird.' },
        ],
      },
      { kind: 'effect', delta: { mrr: 800, hype: 4, day: 10 }, toast: 'First customer: $800 MRR' },
    ],
  },

  // ── 3 ────────────────────────────────────────────────────────────────────
  {
    id: 'demoday',
    title: 'Chapter 3',
    subtitle: 'Demo Day',
    steps: [
      { kind: 'card', title: 'Chapter 3', subtitle: 'Demo Day — Moscone West' },
      { kind: 'teleport', at: PLACES.digitalGarage },
      { kind: 'spawnVehicle', type: 'sedan', at: PLACES.digitalGarage, toast: 'Priya\'s hatchback is parked outside (F to enter)' },
      {
        kind: 'dialogue',
        lines: [
          { speaker: PRIYA, text: 'Demo Day starts in two and a half minutes. Take my car. It pulls left. And right. Go!' },
        ],
      },
      {
        kind: 'goto', id: 'c3-moscone', at: PLACES.mosconeWest,
        label: 'Drive to Moscone West before your slot',
        timer: 150, failText: 'You missed your slot. The organiser squeezes you into the next block — drive!',
        hint: 'Timed. Head south on 4th toward Howard.',
      },
      {
        kind: 'dialogue',
        lines: [
          { speaker: 'MC', text: 'Next up — {company}! Three minutes, founders. Make it count.' },
          {
            speaker: 'Investor (front row)', text: 'What problem are you actually solving?',
            choices: [
              { label: '"We save teams 11 hours a week. We measured it."', effect: { hype: 8 }, reply: 'Numbers. Finally.' },
              { label: '"We\'re building the operating system for the future of work."', effect: { hype: 1 }, reply: '…The fourth one today.' },
              { label: '"Honestly? We\'re still figuring it out, but the dentist loves it."', effect: { hype: 4 }, reply: 'Refreshing. Terrifying, but refreshing.' },
            ],
          },
          {
            speaker: 'Investor (back row)', text: 'What happens when a big incumbent copies you?',
            choices: [
              { label: '"They\'ll try. We ship daily; they ship quarterly."', effect: { hype: 7 }, reply: 'Good answer.' },
              { label: '"They won\'t. Our moat is vibes."', effect: { hype: -3 }, reply: 'Vibes are not a moat.' },
              { label: '"We\'ll have the data. Data compounds."', effect: { hype: 5 }, reply: 'Acceptable.' },
            ],
          },
          {
            speaker: 'MC', text: 'Ten seconds. Close it out.',
            choices: [
              { label: '"Eleven customers, zero churn, we\'re raising. Find us after."', effect: { hype: 6 }, reply: 'Applause. Actual applause.' },
              { label: 'Drop the mic. Literally.', effect: { hype: 3, cash: -300 }, reply: 'The mic was rented. That\'s $300.' },
            ],
          },
        ],
      },
      {
        kind: 'dialogue',
        lines: [
          { speaker: PRIYA, text: 'Three VCs want meetings. All in the Financial District, all tomorrow. Get some sleep. Just kidding — nobody sleeps.' },
        ],
      },
      { kind: 'effect', delta: { day: 14 }, toast: 'Demo Day complete' },
    ],
  },

  // ── 4 ────────────────────────────────────────────────────────────────────
  {
    id: 'seed',
    title: 'Chapter 4',
    subtitle: 'Seed Round',
    steps: [
      { kind: 'card', title: 'Chapter 4', subtitle: 'Seed Round — Montgomery Street' },
      {
        kind: 'talk', id: 'c4-fogline', at: PLACES.montgomery44,
        label: 'Pitch Fogline Capital at 44 Montgomery',
        npc: { name: 'Marcus Lind · Fogline', model: 'character-male-b' },
        lines: [
          { speaker: 'Marcus Lind', text: 'Saw the demo. Liked the numbers. Fogline moves fast. What are you raising?' },
          {
            speaker: YOU, text: 'The ask:',
            choices: [
              { label: '$1M on a $8M post.', effect: { cash: 1_000_000, equity: -12.5, hype: 5 }, reply: 'Reasonable. Term sheet tonight. Don\'t spend it all on billboards.' },
              { label: '$2M on a $15M post.', effect: { cash: 2_000_000, equity: -13.3, hype: 8 }, reply: 'Aggressive. I like aggressive. But I want a board observer seat.', flag: 'observer', flagValue: true },
              { label: '"We\'re not raising yet. What would you need to see?"', effect: { hype: 3 }, reply: 'Discipline! Rare. Call me at $20k MRR and I\'ll double whatever you ask.', flag: 'foglineLater', flagValue: true },
            ],
          },
        ],
      },
      {
        kind: 'talk', id: 'c4-bayshore', at: PLACES.montgomery101,
        label: 'Pitch Bayshore Partners at 101 Montgomery',
        npc: { name: 'Ana Reyes · Bayshore', model: 'character-female-c' },
        lines: [
          { speaker: 'Ana Reyes', text: 'I\'ll be honest: I\'m not sure about the market. I am sure about you two. Bayshore can lead or follow.' },
          {
            speaker: YOU, text: 'Here\'s what we need.',
            choices: [
              { label: 'Take $500k as a follow-on, no board seat.', effect: { cash: 500_000, equity: -5 }, reply: 'Clean. Done. I\'ll send intros to three customers by Friday.' },
              { label: 'Ask her to lead a $3M round with a board seat.', effect: { cash: 3_000_000, equity: -20 }, flag: 'anaBoard', flagValue: true, reply: 'Big round, big dilution. I\'ll be on your board — and in your group chat.' },
              { label: 'Politely pass.', effect: { hype: -1 }, reply: 'Understood. Door stays open.' },
            ],
          },
        ],
      },
      {
        kind: 'talk', id: 'c4-kite', at: PLACES.mckesson,
        label: 'Pitch Kite & Kelp Ventures at McKesson Plaza',
        npc: { name: 'Theo · Kite & Kelp', model: 'character-male-g' },
        lines: [
          { speaker: 'Theo', text: 'We\'re a small fund. We write small checks and send large amounts of unsolicited advice.' },
          {
            speaker: YOU, text: 'Tell me more.',
            choices: [
              { label: 'Take $250k and the advice.', effect: { cash: 250_000, equity: -3, hype: 2 }, reply: 'Welcome aboard. First advice: hire a real accountant.' },
              { label: 'Just the advice, no check.', effect: { hype: 2 }, reply: 'Respect. Advice: your pricing page is a crime.' },
            ],
          },
        ],
      },
      {
        kind: 'dialogue',
        lines: [
          { speaker: PRIYA, text: 'Wires landed. We can hire. We can pay Rafa in money instead of apologies. Four engineers start Monday.' },
          { speaker: PRIYA, text: 'Also, Dev built a hardware dev kit for the enterprise pilot. Four customers want one. Delivered. By us. Today.' },
        ],
      },
      { kind: 'effect', delta: { team: 4, mrr: 5000, day: 40 }, toast: 'Seed closed — team of 8' },
    ],
  },

  // ── 5 ────────────────────────────────────────────────────────────────────
  {
    id: 'shipit',
    title: 'Chapter 5',
    subtitle: 'Ship It',
    steps: [
      { kind: 'card', title: 'Chapter 5', subtitle: 'Ship It — four dev kits, one afternoon' },
      { kind: 'spawnVehicle', type: 'suv', at: PLACES.digitalGarage, toast: 'Company car unlocked — the kits are in the back' },
      {
        kind: 'deliver', id: 'c5-kits', label: 'Deliver dev kits to pilot customers',
        timer: 300, failText: 'The pilots went cold. Priya re-books them — faster this time.',
        stops: [
          { at: PLACES.metreon, label: 'Metreon — gaming studio' },
          { at: PLACES.sfmoma, label: 'SFMOMA — ticketing team' },
          { at: PLACES.hotelNikko, label: 'Hotel Nikko — front desk' },
          { at: PLACES.grandHyatt, label: 'Grand Hyatt — events office' },
        ],
      },
      {
        kind: 'dialogue',
        lines: [
          { speaker: 'Kenji', text: 'All four pilots converted. I posted the delivery route as a "day in the life" thread. It\'s doing numbers.' },
          { speaker: PRIYA, text: 'MRR just tripled. Now we need users — a lot of them, fast. Kenji has… a plan.' },
        ],
      },
      { kind: 'effect', delta: { mrr: 12_000, hype: 10, day: 55 }, toast: 'Pilots converted — $17.8k MRR' },
    ],
  },

  // ── 6 ────────────────────────────────────────────────────────────────────
  {
    id: 'growth',
    title: 'Chapter 6',
    subtitle: 'Growth Hacks',
    steps: [
      { kind: 'card', title: 'Chapter 6', subtitle: 'Growth Hacks — Union Square' },
      {
        kind: 'dialogue',
        lines: [
          { speaker: 'Kenji', text: 'Guerrilla launch. Beta invites, Union Square, lunch rush. Hand out as many as you can before security notices.' },
        ],
      },
      {
        kind: 'collect', id: 'c6-invites', center: PLACES.unionSquare, count: 12, radius: 110, timer: 150,
        label: 'Hand out beta invites around Union Square', itemLabel: 'invite',
        failText: 'Security cleared the square. Kenji prints more invites — go again.',
      },
      {
        kind: 'goto', id: 'c6-billboard', at: PLACES.hallidiePlaza,
        label: 'Meet the billboard rep at Hallidie Plaza',
        hint: 'Powell & Market cable-car turnaround.',
      },
      {
        kind: 'talk', id: 'c6-rep', at: PLACES.hallidiePlaza,
        label: 'Talk to the billboard rep',
        npc: { name: 'Billboard Rep', model: 'character-female-e' },
        lines: [
          { speaker: 'Billboard Rep', text: 'Every founder in this city buys a billboard eventually. The big one over Market is $60k a month. Smaller one by the station, $20k.' },
          {
            speaker: YOU, text: 'Decision time.',
            choices: [
              { label: 'The big one. $60k.', effect: { cash: -60_000, hype: 25 }, flag: 'billboard', flagValue: 'big', reply: 'Bold. Your face will be 40 feet tall by Monday.' },
              { label: 'The small one. $20k.', effect: { cash: -20_000, hype: 10 }, flag: 'billboard', flagValue: 'small', reply: 'Sensible. Commuters will squint at you lovingly.' },
              { label: 'No billboard. We grow organically.', effect: { hype: 3 }, flag: 'billboard', flagValue: 'none', reply: 'Organic. Sure. Call me when the board asks why you have no brand awareness.' },
            ],
          },
        ],
      },
      {
        kind: 'dialogue',
        lines: [
          { speaker: PRIYA, text: 'Sign-ups are vertical. Servers are on fire. Good fire. There\'s just one problem — have you seen Clonely?' },
        ],
      },
      { kind: 'effect', delta: { mrr: 20_000, day: 90 }, toast: 'Growth spike — $37.8k MRR' },
    ],
  },

  // ── 7 ────────────────────────────────────────────────────────────────────
  {
    id: 'rival',
    title: 'Chapter 7',
    subtitle: 'The Rival',
    steps: [
      { kind: 'card', title: 'Chapter 7', subtitle: 'The Rival — 140 New Montgomery' },
      {
        kind: 'dialogue',
        lines: [
          { speaker: PRIYA, text: 'Clonely. Same product, same pricing page, same typos. Launched yesterday. And they just poached Dev.' },
          { speaker: YOU, text: 'Where are they?' },
          { speaker: PRIYA, text: '140 New Montgomery. The old phone-company building. Their CEO is named Blake. Of course he is.' },
        ],
      },
      {
        kind: 'goto', id: 'c7-clonely', at: PLACES.newMontgomery140,
        label: 'Go to Clonely HQ at 140 New Montgomery',
      },
      {
        kind: 'talk', id: 'c7-blake', at: PLACES.newMontgomery140,
        label: 'Confront Blake',
        npc: { name: 'Blake · Clonely CEO', model: 'character-male-a' },
        lines: [
          { speaker: 'Blake', text: 'Hey! Big fan. Huge. We "took inspiration". That\'s how innovation works. Anyway — we\'re raising at a higher valuation than you.' },
          {
            speaker: YOU, text: 'Options.',
            choices: [
              { label: 'Buy them. "$500k and you\'re a feature by Friday."', effect: { cash: -500_000, mrr: 8000, team: 3 }, flag: 'rival', flagValue: 'bought', reply: '…Deal. Honestly I was tired. Dev says hi.' },
              { label: 'Out-ship them. "See you on the leaderboard."', effect: { hype: 15 }, flag: 'rival', flagValue: 'outship', reply: 'Cute. My lawyers will be in touch about the "inspiration" you took from us.' },
              { label: 'Call your lawyer in front of him.', effect: { cash: -40_000, hype: 5 }, flag: 'rival', flagValue: 'lawyer', reply: 'Lawyers? LAWYERS? Fine. Process servers, go!' },
            ],
          },
          { speaker: PRIYA, text: '(text) Ana from Bayshore wants to do the Series A. RIGHT NOW. One Montgomery Tower. Also… why are there men in suits running at you?' },
        ],
      },
      { kind: 'wanted', level: 2 },
      {
        kind: 'goto', id: 'c7-seriesA', at: PLACES.oneMontgomery,
        label: 'Lose Clonely\'s process servers and reach One Montgomery',
        timer: 180, failText: 'They served you in the lobby. Ana laughs it off and reschedules — go again.',
        hint: 'They chase like cops. Grab a car.',
      },
      { kind: 'wanted', level: 0 },
      {
        kind: 'talk', id: 'c7-ana', at: PLACES.oneMontgomery,
        label: 'Sign the Series A with Ana',
        npc: { name: 'Ana Reyes · Bayshore', model: 'character-female-c' },
        lines: [
          { speaker: 'Ana Reyes', text: 'You\'re sweating. Good — means you ran here. Two term sheets on the table.' },
          {
            speaker: YOU, text: 'Pick one.',
            choices: [
              { label: '$15M at $100M post. Board control shifts.', effect: { cash: 15_000_000, equity: -15, hype: 10, team: 20 }, flag: 'seriesA', flagValue: 'big', reply: 'Welcome to the big leagues. Don\'t read the comments.' },
              { label: '$8M at $60M post. Founder-friendly terms.', effect: { cash: 8_000_000, equity: -13, hype: 6, team: 12 }, flag: 'seriesA', flagValue: 'friendly', reply: 'Smart. You keep the wheel. I keep the snacks.' },
            ],
          },
        ],
      },
      { kind: 'effect', delta: { mrr: 60_000, day: 150 }, toast: 'Series A closed' },
    ],
  },

  // ── 8 ────────────────────────────────────────────────────────────────────
  {
    id: 'ipo',
    title: 'Chapter 8',
    subtitle: 'Ring the Bell',
    steps: [
      { kind: 'card', title: 'Chapter 8', subtitle: 'Ring the Bell — three years later' },
      { kind: 'teleport', at: PLACES.huntington },
      {
        kind: 'dialogue',
        lines: [
          { speaker: PRIYA, text: 'Three years. 400 people. Offices in four cities. And this morning, the S-1 went effective.' },
          { speaker: PRIYA, text: 'The exchange is doing a remote bell ceremony from the old Pacific Exchange Building on Pine. We ring at 6:30 sharp. We are at the Huntington. On Nob Hill. It is 6:26.' },
          { speaker: YOU, text: 'Why are we always late to our own life.' },
        ],
      },
      { kind: 'spawnVehicle', type: 'sports', at: PLACES.huntington, toast: 'IPO-day car. You earned it.' },
      {
        kind: 'goto', id: 'c8-exchange', at: PLACES.pacificExchange,
        label: 'Get to the Pacific Exchange Building before 6:30',
        timer: 240, failText: 'They rang without you. The exchange graciously agrees to a do-over. Hurry!',
        hint: 'Down the hill, east on Pine.',
      },
      {
        kind: 'talk', id: 'c8-bell', at: PLACES.pacificExchange,
        label: 'Ring the bell',
        npc: { name: 'Floor Manager', model: 'character-worker' },
        lines: [
          { speaker: 'Floor Manager', text: 'Cutting it close! Cameras are live in ten. Founders, hands on the bell.' },
          { speaker: PRIYA, text: 'From a napkin at Cable Car Coffee to this. Whatever happens at the open — we built {company}.' },
          { speaker: YOU, text: 'Ring it.' },
        ],
      },
      { kind: 'effect', delta: { hype: 10, day: 1100 }, toast: 'DING DING DING' },
    ],
  },
]
