import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { initSentry } from './sentry'
import 'material-symbols/outlined.css'
import './index.css'
import App from './App'

// Initialize Sentry before rendering
initSentry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-canvas-parchment">
          <div className="text-center p-8">
            <span className="material-symbols-outlined text-[48px] text-red-400 mb-4 block">error</span>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">页面出现错误</h2>
            <p className="text-gray-500 mb-4">请刷新页面重试</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
            >
              刷新页面
            </button>
          </div>
        </div>
      }
      showDialog
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
