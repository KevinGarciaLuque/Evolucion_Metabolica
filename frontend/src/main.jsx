import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'flag-icons/css/flag-icons.min.css'
import './index.css'
import App from './App.jsx'
import { iniciarPWA } from './shared/pwa/pwa'

// App instalable: service worker, aviso de versión nueva e instalación
iniciarPWA()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
