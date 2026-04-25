// Test map — minimal static dataset with labelled elements
// Scale: 1 game unit ≈ 1 meter
// Map origin is at (0, 0), west side is negative x

import type { LandscapeData } from '../landscape.types'

export const TEST_MAP: LandscapeData = {
  // ─── Roads ────────────────────────────────────────────────────────────────
  roads: [
    {
      name: 'Main Blvd',
      color: '#333344',
      controlPoints: [
        { x: 0, z: -600 },
        { x: 0, z: -300 },
        { x: 0, z: 0 },
        { x: 0, z: 300 },
        { x: 0, z: 600 },
      ],
      width: 16,
    },
    {
      name: 'Cross St',
      color: '#2a2a3a',
      controlPoints: [
        { x: -400, z: 0 },
        { x: -200, z: 0 },
        { x: 0, z: 0 },
        { x: 200, z: 0 },
        { x: 400, z: 0 },
      ],
      width: 14,
    },
  ],

  roadPaths: [
    // Main Blvd — runs north-south along x=0
    [
      { x: 0, z: -600, angle: Math.PI / 2 },
      { x: 0, z: -500, angle: Math.PI / 2 },
      { x: 0, z: -400, angle: Math.PI / 2 },
      { x: 0, z: -300, angle: Math.PI / 2 },
      { x: 0, z: -200, angle: Math.PI / 2 },
      { x: 0, z: -100, angle: Math.PI / 2 },
      { x: 0, z: 0, angle: Math.PI / 2 },
      { x: 0, z: 100, angle: Math.PI / 2 },
      { x: 0, z: 200, angle: Math.PI / 2 },
      { x: 0, z: 300, angle: Math.PI / 2 },
      { x: 0, z: 400, angle: Math.PI / 2 },
      { x: 0, z: 500, angle: Math.PI / 2 },
      { x: 0, z: 600, angle: Math.PI / 2 },
    ],
    // Cross St — runs east-west along z=0
    [
      { x: -400, z: 0, angle: 0 },
      { x: -300, z: 0, angle: 0 },
      { x: -200, z: 0, angle: 0 },
      { x: -100, z: 0, angle: 0 },
      { x: 0, z: 0, angle: 0 },
      { x: 100, z: 0, angle: 0 },
      { x: 200, z: 0, angle: 0 },
      { x: 300, z: 0, angle: 0 },
      { x: 400, z: 0, angle: 0 },
    ],
  ],

  // ─── Buildings ──────────────────────────────────────────────────────────
  buildings: [
    // Northwest corner buildings
    { x: -100, z: -200, width: 30, depth: 25, height: 60, color: '#1a1a3a', label: 'Tower A' },
    { x: -100, z: -100, width: 20, depth: 20, height: 40, color: '#151535', label: 'Tower B' },
    { x: -200, z: -150, width: 40, depth: 30, height: 80, color: '#202050', label: 'Salesforce Block' },
    { x: -150, z: -250, width: 25, depth: 25, height: 50, color: '#1e1e40', label: 'Office C' },
    // Northeast corner buildings
    { x: 100, z: -200, width: 30, depth: 25, height: 55, color: '#151535', label: 'Tower D' },
    { x: 150, z: -100, width: 20, depth: 20, height: 35, color: '#12122a', label: 'Tower E' },
    { x: 200, z: -150, width: 35, depth: 30, height: 70, color: '#0f0f2a', label: 'Bank Bldg' },
    { x: 100, z: -300, width: 25, depth: 25, height: 45, color: '#18183a', label: 'Hotel N' },
    // Southwest corner buildings
    { x: -100, z: 150, width: 25, depth: 25, height: 40, color: '#222245', label: 'Tower F' },
    { x: -200, z: 200, width: 40, depth: 30, height: 75, color: '#0d0d25', label: 'Civic Bldg' },
    { x: -150, z: 300, width: 20, depth: 20, height: 30, color: '#1c1c3a', label: 'Shops S' },
    { x: -100, z: 400, width: 30, depth: 25, height: 50, color: '#1a1a3a', label: 'Apts SW' },
    // Southeast corner buildings
    { x: 100, z: 150, width: 25, depth: 25, height: 45, color: '#151535', label: 'Tower G' },
    { x: 200, z: 200, width: 35, depth: 30, height: 65, color: '#202050', label: 'Mall SE' },
    { x: 150, z: 300, width: 20, depth: 20, height: 35, color: '#1e1e40', label: 'Cafe Bldg' },
    { x: 100, z: 400, width: 30, depth: 25, height: 55, color: '#12122a', label: 'Apts SE' },
    // Far east/west clusters
    { x: -400, z: 0, width: 20, depth: 20, height: 25, color: '#18183a', label: 'Westside Shop' },
    { x: 400, z: 0, width: 20, depth: 20, height: 25, color: '#1a1a3a', label: 'Eastside Shop' },
    { x: -300, z: -400, width: 30, depth: 30, height: 90, color: '#0f0f2a', label: 'Skyscraper NW' },
    { x: 300, z: 400, width: 30, depth: 30, height: 85, color: '#151535', label: 'Skyscraper SE' },
  ],

  // ─── Trees ───────────────────────────────────────────────────────────────
  trees: [
    // Along Main Blvd
    { x: -8, z: -150, label: 'Oak — north side' },
    { x: 8, z: -150, label: 'Oak — south side' },
    { x: -8, z: -50, label: 'Oak — north side' },
    { x: 8, z: -50, label: 'Oak — south side' },
    { x: -8, z: 50, label: 'Oak — north side' },
    { x: 8, z: 50, label: 'Oak — south side' },
    { x: -8, z: 150, label: 'Oak — north side' },
    { x: 8, z: 150, label: 'Oak — south side' },
    { x: -8, z: 250, label: 'Oak — north side' },
    { x: 8, z: 250, label: 'Oak — south side' },
    { x: -8, z: 350, label: 'Oak — north side' },
    { x: 8, z: 350, label: 'Oak — south side' },
    // Along Cross St
    { x: -150, z: -8, label: 'Oak — west side' },
    { x: -150, z: 8, label: 'Oak — east side' },
    { x: -50, z: -8, label: 'Oak — west side' },
    { x: -50, z: 8, label: 'Oak — east side' },
    { x: 50, z: -8, label: 'Oak — west side' },
    { x: 50, z: 8, label: 'Oak — east side' },
    { x: 150, z: -8, label: 'Oak — west side' },
    { x: 150, z: 8, label: 'Oak — east side' },
    { x: 250, z: -8, label: 'Oak — west side' },
    { x: 250, z: 8, label: 'Oak — east side' },
    // Corners
    { x: -50, z: -50, label: 'Corner Oak NW' },
    { x: 50, z: -50, label: 'Corner Oak NE' },
    { x: -50, z: 50, label: 'Corner Oak SW' },
    { x: 50, z: 50, label: 'Corner Oak SE' },
    { x: -50, z: -250, label: 'Corner Oak NW2' },
    { x: 50, z: -250, label: 'Corner Oak NE2' },
  ],

  // ─── Street Lamps ──────────────────────────────────────────────────────
  streetLamps: [
    // Along Main Blvd every 100 units
    { x: -10, z: -300, label: 'Lamp — Main/Market' },
    { x: 10, z: -200, label: 'Lamp — Main/Broadway' },
    { x: -10, z: -100, label: 'Lamp — Main/Mission' },
    { x: 10, z: 0, label: 'Lamp — Main/Center' },
    { x: -10, z: 100, label: 'Lamp — Main/South' },
    { x: 10, z: 200, label: 'Lamp — Main/Civic' },
    { x: -10, z: 300, label: 'Lamp — Main/Bay' },
    // Along Cross St every 100 units
    { x: -300, z: -10, label: 'Lamp — Cross/West' },
    { x: -200, z: 10, label: 'Lamp — Cross/MidW' },
    { x: -100, z: -10, label: 'Lamp — Cross/Civic' },
    { x: 0, z: 10, label: 'Lamp — Cross/Center' },
    { x: 100, z: -10, label: 'Lamp — Cross/MidE' },
    { x: 200, z: 10, label: 'Lamp — Cross/Mall' },
    { x: 300, z: -10, label: 'Lamp — Cross/East' },
  ],

  // ─── Traffic Lights ────────────────────────────────────────────────────
  trafficLights: [
    { x: 0, z: -100, angle: 0, label: 'TL — Main/Civic' },
    { x: 0, z: 100, angle: 0, label: 'TL — Main/South' },
    { x: -100, z: 0, angle: Math.PI / 2, label: 'TL — Cross/Civic' },
    { x: 100, z: 0, angle: Math.PI / 2, label: 'TL — Cross/Mid' },
  ],

  // ─── Bus Stops ──────────────────────────────────────────────────────────
  busStops: [
    { x: 0, z: -200, angle: Math.PI / 2, name: 'Main & Broadway', label: 'Bus Stop NB-1' },
    { x: 0, z: 200, angle: Math.PI / 2, name: 'Main & Civic', label: 'Bus Stop SB-1' },
    { x: -200, z: 0, angle: 0, name: 'Cross & Market', label: 'Bus Stop EB-1' },
    { x: 200, z: 0, angle: 0, name: 'Cross & Mall', label: 'Bus Stop WB-1' },
  ],

  // ─── Crosswalks ─────────────────────────────────────────────────────────
  crosswalks: [
    { x: 0, z: -100, angle: 0, label: 'Xwalk — Main/Civic' },
    { x: 0, z: 100, angle: 0, label: 'Xwalk — Main/South' },
    { x: -100, z: 0, angle: Math.PI / 2, label: 'Xwalk — Cross/Civic' },
    { x: 100, z: 0, angle: Math.PI / 2, label: 'Xwalk — Cross/Mid' },
    { x: 0, z: -300, angle: 0, label: 'Xwalk — Main/Market' },
    { x: -300, z: 0, angle: Math.PI / 2, label: 'Xwalk — Cross/West' },
  ],

  // ─── Sidewalks ───────────────────────────────────────────────────────────
  sidewalks: [
    // Main Blvd north side (left of center when facing north)
    { x: -8, z: -300, angle: Math.PI / 2, len: 10, label: 'SW — Main NB-1' },
    { x: -8, z: -200, angle: Math.PI / 2, len: 10, label: 'SW — Main NB-2' },
    { x: -8, z: -100, angle: Math.PI / 2, len: 10, label: 'SW — Main NB-3' },
    { x: -8, z: 0, angle: Math.PI / 2, len: 10, label: 'SW — Main NB-4' },
    { x: -8, z: 100, angle: Math.PI / 2, len: 10, label: 'SW — Main NB-5' },
    { x: -8, z: 200, angle: Math.PI / 2, len: 10, label: 'SW — Main NB-6' },
    { x: -8, z: 300, angle: Math.PI / 2, len: 10, label: 'SW — Main NB-7' },
    // Main Blvd south side
    { x: 8, z: -300, angle: Math.PI / 2, len: 10, label: 'SW — Main SB-1' },
    { x: 8, z: -200, angle: Math.PI / 2, len: 10, label: 'SW — Main SB-2' },
    { x: 8, z: -100, angle: Math.PI / 2, len: 10, label: 'SW — Main SB-3' },
    { x: 8, z: 0, angle: Math.PI / 2, len: 10, label: 'SW — Main SB-4' },
    { x: 8, z: 100, angle: Math.PI / 2, len: 10, label: 'SW — Main SB-5' },
    { x: 8, z: 200, angle: Math.PI / 2, len: 10, label: 'SW — Main SB-6' },
    { x: 8, z: 300, angle: Math.PI / 2, len: 10, label: 'SW — Main SB-7' },
    // Cross St west side
    { x: -300, z: -8, angle: 0, len: 10, label: 'SW — Cross W-1' },
    { x: -200, z: 8, angle: 0, len: 10, label: 'SW — Cross W-2' },
    { x: -100, z: -8, angle: 0, len: 10, label: 'SW — Cross W-3' },
    { x: 0, z: 8, angle: 0, len: 10, label: 'SW — Cross W-4' },
    { x: 100, z: -8, angle: 0, len: 10, label: 'SW — Cross W-5' },
    { x: 200, z: 8, angle: 0, len: 10, label: 'SW — Cross W-6' },
    { x: 300, z: -8, angle: 0, len: 10, label: 'SW — Cross W-7' },
  ],

  // ─── Parking Lots ────────────────────────────────────────────────────────
  parkingLots: [
    { x: -150, z: -350, angle: 0, label: 'Parking NW' },
    { x: 150, z: 350, angle: 0, label: 'Parking SE' },
    { x: -150, z: 350, angle: 0, label: 'Parking SW' },
    { x: 150, z: -350, angle: 0, label: 'Parking NE' },
  ],

  // ─── Benches ─────────────────────────────────────────────────────────────
  benches: [
    { x: -6, z: -200, angle: 0, label: 'Bench — Main NB-1' },
    { x: 6, z: -100, angle: Math.PI, label: 'Bench — Main SB-1' },
    { x: -6, z: 0, angle: 0, label: 'Bench — Main NB-2' },
    { x: 6, z: 100, angle: Math.PI, label: 'Bench — Main SB-2' },
    { x: -6, z: 200, angle: 0, label: 'Bench — Main NB-3' },
    { x: 6, z: 300, angle: Math.PI, label: 'Bench — Main SB-3' },
    { x: -200, z: 6, angle: Math.PI / 2, label: 'Bench — Cross W-1' },
    { x: 0, z: -6, angle: -Math.PI / 2, label: 'Bench — Cross E-1' },
    { x: 200, z: 6, angle: Math.PI / 2, label: 'Bench — Cross W-2' },
    { x: 0, z: 6, angle: -Math.PI / 2, label: 'Bench — Cross E-2' },
  ],

  // ─── Fire Hydrants ──────────────────────────────────────────────────────
  hydrants: [
    { x: -5, z: -250, label: 'Hydrant — Main NB-1' },
    { x: 5, z: -150, label: 'Hydrant — Main SB-1' },
    { x: -5, z: -50, label: 'Hydrant — Main NB-2' },
    { x: 5, z: 50, label: 'Hydrant — Main SB-2' },
    { x: -5, z: 150, label: 'Hydrant — Main NB-3' },
    { x: 5, z: 250, label: 'Hydrant — Main SB-3' },
    { x: -150, z: 5, label: 'Hydrant — Cross W-1' },
    { x: 0, z: -5, label: 'Hydrant — Cross E-1' },
    { x: 150, z: 5, label: 'Hydrant — Cross W-2' },
  ],

  // ─── Rail (Caltrain) ────────────────────────────────────────────────────
  caltransLines: [],
  caltransPaths: [],

  // ─── Water ──────────────────────────────────────────────────────────────
  // No water in test map — keep to the east
  water: {
    x: 2000,
    z: 0,
    width: 1,
    height: 1,
  },
}

export const MAP_DATA = TEST_MAP
export const SPAWN_POINT: [number, number, number] = [0, 2, 0]
