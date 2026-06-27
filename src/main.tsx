import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.tsx'
import { CloudProvider } from './cloud.tsx'
import { applyPrefs, loadPrefs } from './prefs'
import { applyTheme } from './themes'
import { readPlayer } from './player'

// Projette l'apparence + le thème équipé avant le premier rendu (évite le flash).
applyPrefs(loadPrefs())
applyTheme(readPlayer().equippedTheme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CloudProvider>
      <App />
    </CloudProvider>
  </StrictMode>,
)
