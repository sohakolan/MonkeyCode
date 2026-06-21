import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.tsx'
import { CloudProvider } from './cloud.tsx'
import { applyPrefs, loadPrefs } from './prefs'

// Projette l'apparence enregistrée avant le premier rendu (évite le flash).
applyPrefs(loadPrefs())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CloudProvider>
      <App />
    </CloudProvider>
  </StrictMode>,
)
