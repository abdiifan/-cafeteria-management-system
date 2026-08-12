import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Registers the app-shell offline cache (src/../public/sw.js). This only
// caches the app's own static files, never Supabase API calls — sale data
// offline-handling lives in src/lib/offlineQueue.js instead.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal: app still works online without it, just without the
      // offline app-shell cache.
    })
  })
}
