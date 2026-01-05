import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n' // Add this
import { AiDebugProvider } from './context/AiDebugContext'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AiDebugProvider>
      <App />
    </AiDebugProvider>
  </StrictMode>,
)
