import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'

import { App } from '@/app/App'
import { labLog } from '@/features/lab/labLog'
import { bootstrapSpotifyAuth } from '@/lib/spotify/auth'
import '@/index.css'

// Vor dem Rendern: OAuth-Rücksprung genau einmal auswerten und die URL bereinigen.
// Bewusst außerhalb von React, damit StrictMode den Authorization Code nicht doppelt einlöst.
void bootstrapSpotifyAuth().then((outcome) => {
  if (outcome.kind === 'authorized') labLog('ok', 'Spotify: Tokens erhalten')
  if (outcome.kind === 'failed') labLog('error', `Spotify-Login fehlgeschlagen: ${outcome.reason}`)
})

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('#root nicht gefunden')

createRoot(rootElement).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
