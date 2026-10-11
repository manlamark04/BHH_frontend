import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Prevent mouse wheel / touchpad scrolling from adjusting number inputs
document.addEventListener('wheel', () => {
  if (document.activeElement && (document.activeElement as HTMLInputElement).type === 'number') {
    (document.activeElement as HTMLElement).blur()
  }
}, { passive: true })

// Suppress browser default page title / URL in print headers & footers
let printOriginalTitle = document.title
window.addEventListener('beforeprint', () => {
  printOriginalTitle = document.title
  document.title = ''
})
window.addEventListener('afterprint', () => {
  document.title = printOriginalTitle || 'Cambacay Breeze Inn'
})
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
    printOriginalTitle = document.title
    document.title = ''
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
