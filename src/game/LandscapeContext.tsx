// Landscape data context — provides the active landscape data to all world consumers
// When currentMapName changes in the store, the provider re-loads map data

import { createContext, useContext, useState } from 'react'
import { useGameStore } from './store'
import { loadLandscapeData } from './loadMapData'
import type { LandscapeData } from './landscape.types'

const LandscapeContext = createContext<LandscapeData | null>(null)

export function LandscapeProvider({ children }: { children: React.ReactNode }) {
  const currentMapName = useGameStore((s) => s.currentMapName)
  // Load synchronously so data is available on the very first render
  const [data] = useState<LandscapeData>(() => loadLandscapeData(currentMapName))

  return (
    <LandscapeContext.Provider value={data}>
      {children}
    </LandscapeContext.Provider>
  )
}

export function useLandscapeData(): LandscapeData {
  const ctx = useContext(LandscapeContext)
  if (!ctx) throw new Error('useLandscapeData must be used inside <LandscapeProvider>')
  return ctx
}
