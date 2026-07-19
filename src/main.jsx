import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Universe from './racingLeague/Universe.jsx'
import CoffeeRuns from './coffeeRuns/CoffeeRuns.jsx'
import './index.css'

const isRacingLeague = window.location.pathname.startsWith('/racing-league')
const isCoffeeRuns = window.location.pathname.startsWith('/coffee')
const isPublic = window.location.pathname.startsWith('/display')

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
