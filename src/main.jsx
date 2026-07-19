import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Universe from './racingLeague/Universe.jsx'
import CoffeeRuns from './coffeeRuns/CoffeeRuns.jsx'
import './index.css'

const path = window.location.pathname
const isRacingLeague = path.startsWith('/racing-league')
const isCoffeeRuns = path.startsWith('/coffee')
// Public (read-only) view lives at /display; the editable admin app is served
// at /admin. On the deployed site the root `/` redirects to /display (see
// public/_redirects), so /admin is the stable way to reach the admin app —
// including from a phone. In dev, `/` also renders the admin app (no redirect).
const isPublic = path.startsWith('/display')

function Root() {
  if (isRacingLeague) return <Universe />
  if (isCoffeeRuns) return <CoffeeRuns />
  return <App isPublic={isPublic} />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
