'use client'

import { EventProvider } from '@/contexts/event-context'

export function Providers({ children }: { children: React.ReactNode }) {
  return <EventProvider>{children}</EventProvider>
}
