import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Universe from './racingLeague/Universe.jsx'
import CoffeeRuns from './coffeeRuns/CoffeeRuns.jsx'
import SecretSanta from './secretSanta/SecretSanta.jsx'
import './index.css'

// Admin-only booking office; lazy so the car site's bundle doesn't carry it.
const Wrestling = React.lazy(() => import('./wrestling/Wrestling.jsx'))

const path = window.location.pathname
const isRacingLeague = path.startsWith('/racing-league')
const isCoffeeRuns = path.startsWith('/coffee')
// Private, unlinked page; entrants get the URL and their code directly.
const isSecretSanta = path.startsWith('/secret-santa')
// Admin-only (gated client-side on the admin key, and every /api/wr/* call re-checks it).
const isWrestling = path.startsWith('/wrestling')
// Public (read-only) view lives at /display; the editable admin app is served
// at /admin. On the deployed site the root `/` redirects to /display (see
// public/_redirects), so /admin is the stable way to reach the admin app —
// including from a phone. In dev, `/` also renders the admin app (no redirect).
const isPublic = path.startsWith('/display')

function Root() {
  if (isRacingLeague) return <Universe />
  if (isCoffeeRuns) return <CoffeeRuns />
  if (isSecretSanta) return <SecretSanta />
  if (isWrestling) return <Suspense fallback={null}><Wrestling /></Suspense>
  return <App isPublic={isPublic} />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
