import './assets/main.css'
import './assets/onboarding.css'
import { applyTheme } from './theme'

// Apply the saved/system theme (dark default) before first paint.
applyTheme()

import { StrictMode, type FC } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { TooltipProvider } from './components/ui/tooltip'

// The quick-paste popup is a Pro feature; its component lives in the pro package.
// The Vite alias resolves `@offgrid/pro/renderer` to a stub in free builds (which
// exports a no-op ClipboardPopup), and in free builds the popup window never opens.
import * as ProRenderer from '@offgrid/pro/renderer'
const ClipboardPopup: FC = (ProRenderer as { ClipboardPopup?: FC }).ClipboardPopup ?? (() => null)

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
        <App />
      </TooltipProvider>
    )}
  </StrictMode>
)
