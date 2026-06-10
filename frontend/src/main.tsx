import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// Self-hosted fonts & icons (no CDN) so the app works offline and never depends on
// Google Fonts / cdnjs. Roboto weights match the previous CDN request (400/500/700).
// Only the latin + latin-ext subsets are imported — latin-ext covers Polish
// diacritics (ą ć ę ł ń ó ś ż ź); the other subsets (Cyrillic/Greek/…) would just
// bloat the precache. Font Awesome keeps the same `fas`/`far`/`fab` class API.
import '@fontsource/roboto/latin-400.css'
import '@fontsource/roboto/latin-ext-400.css'
import '@fontsource/roboto/latin-500.css'
import '@fontsource/roboto/latin-ext-500.css'
import '@fontsource/roboto/latin-700.css'
import '@fontsource/roboto/latin-ext-700.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
// Flag sprites (MIT, flag-icons). Imported before index.css so Tailwind's width/
// height utilities on <Flag> win over the default `.fi` sizing on equal specificity.
import 'flag-icons/css/flag-icons.min.css'
import './index.css'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { SettingsProvider } from './lib/settings'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SettingsProvider>
            <App />
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
