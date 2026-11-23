// Weapon definitions. All numbers are our own tuning — damage per hit,
// cyclic rate, effective range, cone spread, pellets for the shotgun,
// magazine size and reload time.
export type WeaponId = 'fist' | 'pistol' | 'smg' | 'shotgun' | 'rifle'

export interface WeaponSpec {
  id: WeaponId
  name: string
  short: string
  damage: number
  /** rounds per minute (fist: swings per minute) */
  rpm: number
  range: number
  /** half-angle of the spread cone in radians (hip) */
  spread: number
  pellets: number
  auto: boolean
  clip: number
  reloadMs: number
  /** ammo granted by a pickup */
  pickupAmmo: number
  /** max reserve ammo */
  maxAmmo: number
  sound: 'pistol' | 'smg' | 'shotgun' | 'rifle' | null
  /** animation family on the rigged character */
  hold: 'none' | 'right' | 'both'
  /** chance a hit kills momentum / knocks a ped down */
  knockback: number
}

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  fist:    { id: 'fist',    name: 'Fists',        short: 'FIST', damage: 12,  rpm: 150, range: 1.9,  spread: 0,     pellets: 1, auto: false, clip: 0,  reloadMs: 0,    pickupAmmo: 0,  maxAmmo: 0,   sound: null,      hold: 'none',  knockback: 0.4 },
  pistol:  { id: 'pistol',  name: 'Pistol',       short: 'PST',  damage: 28,  rpm: 300, range: 70,   spread: 0.012, pellets: 1, auto: false, clip: 12, reloadMs: 1300, pickupAmmo: 36, maxAmmo: 240, sound: 'pistol',  hold: 'right', knockback: 0.25 },
  smg:     { id: 'smg',     name: 'Micro SMG',    short: 'SMG',  damage: 16,  rpm: 780, range: 55,   spread: 0.03,  pellets: 1, auto: true,  clip: 30, reloadMs: 1700, pickupAmmo: 90, maxAmmo: 600, sound: 'smg',     hold: 'both',  knockback: 0.15 },
  shotgun: { id: 'shotgun', name: 'Pump Shotgun', short: 'SHG',  damage: 11,  rpm: 70,  range: 28,   spread: 0.07,  pellets: 8, auto: false, clip: 6,  reloadMs: 2400, pickupAmmo: 18, maxAmmo: 120, sound: 'shotgun', hold: 'both',  knockback: 0.9 },
  rifle:   { id: 'rifle',   name: 'Carbine',      short: 'RFL',  damage: 24,  rpm: 540, range: 110,  spread: 0.016, pellets: 1, auto: true,  clip: 30, reloadMs: 2000, pickupAmmo: 60, maxAmmo: 420, sound: 'rifle',   hold: 'both',  knockback: 0.3 },
}

export const WEAPON_ORDER: WeaponId[] = ['fist', 'pistol', 'smg', 'shotgun', 'rifle']

export interface WeaponSlot { owned: boolean; clip: number; ammo: number }

export const defaultWeapons = (): Record<WeaponId, WeaponSlot> => ({
  fist: { owned: true, clip: 0, ammo: 0 },
  pistol: { owned: false, clip: 0, ammo: 0 },
  smg: { owned: false, clip: 0, ammo: 0 },
  shotgun: { owned: false, clip: 0, ammo: 0 },
  rifle: { owned: false, clip: 0, ammo: 0 },
})
