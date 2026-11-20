import { StrictMode } from 'react' // @jiahe
import { createRoot } from 'react-dom/client'
import { Cache } from 'three'
import './index.css'
import App from './App'

// Dedupe shared asset fetches: every Kenney GLB references the same
// Textures/colormap.png; without the cache each model re-downloads it.
Cache.enabled = true

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)