import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ErrorBoundary } from './components/UIComponents'
import { SiteProvider } from './context/SiteContext'
import { UIProvider } from './context/UIContext'
import { FilterProvider } from './context/FilterContext'
import { UndoProvider } from './context/UndoContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <UndoProvider>
        <SiteProvider>
          <UIProvider>
            <FilterProvider>
              <App />
            </FilterProvider>
          </UIProvider>
        </SiteProvider>
      </UndoProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
