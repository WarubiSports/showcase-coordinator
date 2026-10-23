'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export type InvitesTab = 'invites' | 'roster'

// The sidebar's Kader entry opens /invites?tab=roster; this picks the tab from the URL, also on a later navigation
const Sync = ({ onTab }: { onTab: (tab: InvitesTab) => void }) => {
  const tab = useSearchParams().get('tab')
  useEffect(() => {
    onTab(tab === 'roster' ? 'roster' : 'invites')
  }, [tab, onTab])
  return null
}

export const TabFromUrl = ({ onTab }: { onTab: (tab: InvitesTab) => void }) => (
  <Suspense fallback={null}>
    <Sync onTab={onTab} />
  </Suspense>
)
