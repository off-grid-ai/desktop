import './assets/main.css'
import './assets/onboarding.css'
import { applyTheme } from './theme'

// Apply the saved/system theme (dark default) before first paint.
applyTheme()

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ClipboardPopup } from './components/ClipboardPopup'
import { ThemeToggle } from './components/ThemeToggle'
import { TooltipProvider } from './components/ui/tooltip'

// The global-hotkey quick-paste popup loads this same renderer with #clip-popup,
// so render just the compact popup there instead of the full app.
const isClipPopup = window.location.hash === '#clip-popup'

// No analytics / telemetry. Off Grid AI is local-first — nothing leaves your device.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isClipPopup ? (
      <ClipboardPopup />
    ) : (
      <TooltipProvider delayDuration={300}>
        <ThemeToggle />
        <App />
      </TooltipProvider>
    )}
  </StrictMode>
)
