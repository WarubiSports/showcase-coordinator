import { NextResponse } from 'next/server'

// Invite plus the linked sign-up. Both sides select every column on purpose: a column added by a later
// migration (profile_url, 23.10) must not break reads when the code is deployed before the migration runs.
export const INVITE_WITH_PLAYER_SELECT = '*, player:showcase_players(*)'

// Until the 20261022000001_selection_invites migration is applied, the table and the new columns are missing.
// The UI shows a banner instead of an error in that case.
export const isMigrationPending = (message: string | undefined): boolean =>
  !!message && /showcase_invites|schema cache|does not exist|jersey_number|school_type|consent_/i.test(message)

export const dbError = (message: string | undefined) =>
  isMigrationPending(message)
    ? NextResponse.json({ error: 'migration_pending', detail: message }, { status: 503 })
    : NextResponse.json({ error: message ?? 'Database error' }, { status: 500 })
