import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.tsx'
import { env } from '@/lib/env'
import { AppAlertProvider } from "@/components/alerts/AppAlertProvider"

const PUBLISHABLE_KEY = env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <AppAlertProvider>
        <App />
      </AppAlertProvider>
    </ClerkProvider>
  </StrictMode>,
)
