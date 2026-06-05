import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
