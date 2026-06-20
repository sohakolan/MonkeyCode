import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.tsx'
import { CloudProvider } from './cloud.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CloudProvider>
      <App />
    </CloudProvider>
  </StrictMode>,
)
