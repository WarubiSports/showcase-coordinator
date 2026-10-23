'use client'

import { AdminOnlyNotice } from '@/components/invites/admin-only-notice'

interface InvitesNoticesProps {
  templateEvent: boolean
  migrationPending: boolean
  error: string | null
}

// Lines above the invite list: admin-only redirect, template event warning, missing migration, load error
export const InvitesNotices = ({ templateEvent, migrationPending, error }: InvitesNoticesProps) => (
  <>
    <AdminOnlyNotice />
    {templateEvent && (
      <div className="rounded-lg border border-amber-500/50 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
        Das ist das Template-Event. Bitte zum echten Event wechseln, bevor du einlädst.
      </div>
    )}
    {migrationPending && (
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Einladungen sind in der Datenbank noch nicht eingerichtet. Migration <code>20261022000001_selection_invites.sql</code> ausführen und neu laden.
      </div>
    )}
    {error && <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
  </>
)
