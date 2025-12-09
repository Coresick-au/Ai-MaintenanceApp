import React from 'react'
import ReactDOM from 'react-dom/client'
import Portal from './Portal.jsx'
import './index.css'
import { GlobalDataProvider } from './context/GlobalDataContext'

// GlobalDataProvider wraps the entire Portal to provide customers, sites, and employees
// to all apps (Maintenance, Inventory, Quoting, Customer Portal)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GlobalDataProvider>
      <Portal />
    </GlobalDataProvider>
  </React.StrictMode>,
)
