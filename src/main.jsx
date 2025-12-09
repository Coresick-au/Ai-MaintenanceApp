import React from 'react'
import ReactDOM from 'react-dom/client'
import Portal from './Portal.jsx'
import './index.css'

// Note: Context Providers have been moved to app-specific wrappers
// (e.g., apps/MaintenanceWrapper.jsx) to enable lazy loading and isolation

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Portal />
  </React.StrictMode>,
)
