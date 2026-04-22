import type { CityConfig, VehicleSpec } from './types'

export const CITIES: CityConfig[] = [
  {
    id: 'sf',
    name: 'San Francisco Bay',
    center: [-122.4194, 37.7749],
    zoom: 14,
    groundColor: '#1a1a2e',
    waterColor: '#0a1628',
  },
  {
    id: 'la',
    name: 'Los Angeles',
    center: [-118.2437, 34.0522],
    zoom: 13,
    groundColor: '#1a1a2e',
    waterColor: '#0a1628',
  },
  {
    id: 'nyc',
    name: 'New York City',
    center: [-73.9857, 40.7484],
    zoom: 14,
    groundColor: '#1a1a2e',
    waterColor: '#0a1628',
  },
  {
    id: 'miami',
    name: 'Miami',
    center: [-80.1918, 25.7617],
    zoom: 13,
    groundColor: '#1a1a2e',
    waterColor: '#0a1628',
  },
  {
    id: 'london',
    name: 'London',
    center: [-0.1276, 51.5074],
    zoom: 14,
    groundColor: '#1a1a2e',
    waterColor: '#0a1628',
  },
]

export const VEHICLES: VehicleSpec[] = [
  {
    type: 'cybertruck',
    name: 'Tesla Cybertruck',
    brand: 'Tesla',
    color: '#b8b8b8',
    maxSpeed: 120,
    acceleration: 60,
    handling: 0.85,
    mass: 2500,
    dimensions: { x: 2.4, y: 1.8, z: 5.2 },
  },
  {
    type: 'modelS',
    name: 'Tesla Model S',
    brand: 'Tesla',
    color: '#e8e8e8',
    maxSpeed: 100,
    acceleration: 70,
    handling: 0.95,
    mass: 2100,
    dimensions: { x: 2.0, y: 1.4, z: 4.8 },
  },
  {
    type: 'sports',
    name: 'Porsche 911',
    brand: 'Porsche',
    color: '#cc0000',
    maxSpeed: 140,
    acceleration: 90,
    handling: 1.0,
    mass: 1500,
    dimensions: { x: 2.0, y: 1.2, z: 4.5 },
  },
  {
    type: 'suv',
    name: 'Tesla Model X',
    brand: 'Tesla',
    color: '#2a2a2a',
    maxSpeed: 95,
    acceleration: 65,
    handling: 0.8,
    mass: 2600,
    dimensions: { x: 2.2, y: 1.75, z: 5.0 },
  },
  {
    type: 'sedan',
    name: 'Tesla Model 3',
    brand: 'Tesla',
    color: '#e8e8e8',
    maxSpeed: 105,
    acceleration: 80,
    handling: 0.9,
    mass: 1800,
    dimensions: { x: 1.9, y: 1.45, z: 4.7 },
  },
  {
    type: 'semi',
    name: 'Tesla Semi',
    brand: 'Tesla',
    color: '#b8b8b8',
    maxSpeed: 80,
    acceleration: 35,
    handling: 0.5,
    mass: 8000,
    dimensions: { x: 2.5, y: 2.5, z: 9.0 },
  },
  {
    type: 'plane',
    name: 'Aero Glider',
    brand: 'Unknown',
    color: '#c0c0c0',
    maxSpeed: 200,
    acceleration: 80,
    handling: 0.6,
    mass: 1200,
    dimensions: { x: 6, y: 2, z: 8 },
  },
  {
    type: 'boat',
    name: 'Bay Cruiser',
    brand: 'Unknown',
    color: '#ffffff',
    maxSpeed: 60,
    acceleration: 40,
    handling: 0.5,
    mass: 1500,
    dimensions: { x: 2.4, y: 1.0, z: 5.0 },
  },
  {
    type: 'scooter',
    name: 'E-Scooter',
    brand: 'Unknown',
    color: '#333333',
    maxSpeed: 30,
    acceleration: 20,
    handling: 1.2,
    mass: 120,
    dimensions: { x: 0.25, y: 1.1, z: 1.0 },
  },
  {
    type: 'caltrain',
    name: 'Caltrain',
    brand: 'Caltrain',
    color: '#cc4422',
    maxSpeed: 80,
    acceleration: 50,
    handling: 0.3,
    mass: 50000,
    dimensions: { x: 2.8, y: 2.0, z: 8.0 },
  },
]

export const PLAYER_CONFIG = {
  walkSpeed: 8,
  runSpeed: 16,
  jumpForce: 10,
  height: 1.8,
  radius: 0.3,
  cameraDistance: 6,
  cameraHeight: 2.5,
  interactRange: 3,
}

export const MAP_SIZE = 1600
export const BUILDING_COUNT = 480
export const TREE_COUNT = 320
export const NPC_COUNT = 200
export const TRAFFIC_COUNT = 80
export const VEHICLE_COUNT = 80

export const NPC_COLORS = [
  '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bd6',
  '#c9b1ff', '#ff9f43', '#00d2d3', '#ff9ff3', '#54a0ff',
]

export const BUILDING_COLORS = [
  '#1a1a3a', '#151535', '#202050', '#0f0f2a', '#1e1e40',
  '#12122a', '#18183a', '#222245', '#0d0d25', '#1c1c3a',
]

export const WINDOW_COLORS = ['#00e5ff', '#ffb300', '#ffffff', '#ff6b6b', '#00ff88']
