'use client'

interface InvitesNoticesProps {
  templateEvent: boolean
  migrationPending: boolean
  error: string | null
}

// Lines above the invite list: template event warning, missing migration, load error
export const InvitesNotices = ({ templateEvent, migrationPending, error }: InvitesNoticesProps) => (
  <>
    {templateEvent && (
      <div className="rounded-lg border border-amber-500/50 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
        This is the template event, switch to the real event before inviting.
      </div>
    )}
    {migrationPending && (
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Invites are not set up in the database yet. Apply migration <code>20261022000001_selection_invites.sql</code> and refresh.
      </div>
    )}
    {error && <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
  </>
)
