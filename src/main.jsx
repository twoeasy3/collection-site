import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const isPublic = window.location.pathname.startsWith('/display')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App isPublic={isPublic} />
  </React.StrictMode>,
)