import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ui/error-boundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Sits above the router so a render-time throw in any page shows a
        recoverable screen instead of unmounting the app into a white page. */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
