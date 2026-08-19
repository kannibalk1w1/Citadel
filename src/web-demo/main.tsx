import React from 'react'
import ReactDOM from 'react-dom/client'
import showcaseData from '../../examples/showcase.citadel?raw'
import App from '../renderer/App'
import { createDemoBridge } from '../renderer/platform/demoBridge'
import { ThemeProvider } from '../renderer/theme/ThemeProvider'
import '../renderer/theme/fonts.css'
import '../renderer/theme/dark.css'
import '../renderer/theme/light.css'
import '../renderer/theme/cleanArchive.css'
import '../renderer/theme/graphite.css'

// App modules remain shared with Electron. Install the browser implementation
// before React mounts, so every existing renderer call sees one stable bridge.
window.ipc = createDemoBridge(showcaseData) as unknown as Window['ipc']

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
