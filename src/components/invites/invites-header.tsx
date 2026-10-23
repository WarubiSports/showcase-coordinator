'use client'

import { LogOut, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { StaffIdentity } from '@/lib/staff-session'

interface InvitesHeaderProps {
  eventName: string | null
  isLoading: boolean
  staff: StaffIdentity | null
  onRefresh: () => void
  onSignOut: () => void
}

export const InvitesHeader = ({ eventName, isLoading, staff, onRefresh, onSignOut }: InvitesHeaderProps) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 className="text-2xl font-bold">Invites</h1>
      <p className="text-muted-foreground">
        {eventName ? `${eventName}: personal links, WhatsApp texts and the live overview` : 'Select an event first'}
      </p>
      {staff && (
        <p className="mt-1 text-xs text-muted-foreground">
          Signed in as {staff.full_name ?? staff.email} (Staff App login)
        </p>
      )}
    </div>
    <div className="flex gap-2">
      <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      {staff && (
        <Button variant="ghost" onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      )}
    </div>
  </div>
)
