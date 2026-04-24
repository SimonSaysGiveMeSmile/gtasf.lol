// Landscape data context — provides the active LANDSCAPE_CONFIG to all world consumers
// When currentMapName changes in the store, the provider re-loads the map data

import { createContext, useContext, useEffect, useState } from 'react'
import { useGameStore } from './store'
import { loadLandscapeData } from './loadMapData'
import type { LandscapeData } from './landscape.types'

const LandscapeContext = createContext<LandscapeData | null>(null)

export function LandscapeProvider({ children }: { children: React.ReactNode }) {
  const currentMapName = useGameStore((s) => s.currentMapName)
  const [data, setData] = useState<LandscapeData>(() => loadLandscapeData(currentMapName))

  useEffect(() => {
    setData(loadLandscapeData(currentMapName))
  }, [currentMapName])

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
