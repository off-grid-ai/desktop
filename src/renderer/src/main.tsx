import './assets/main.css'
import './assets/onboarding.css'
import { applyTheme } from './theme'

// Apply the saved/system theme (dark default) before first paint.
applyTheme()

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ThemeToggle } from './components/ThemeToggle'
import { TooltipProvider } from './components/ui/tooltip'

// No analytics / telemetry. Off Grid AI is local-first — nothing leaves your device.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider delayDuration={300}>
      <ThemeToggle />
      <App />
    </TooltipProvider>
  </StrictMode>
)
