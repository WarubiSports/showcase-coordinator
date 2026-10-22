import { NextResponse } from 'next/server'

// Columns the staff list needs from the linked sign-up
export const INVITE_PLAYER_SELECT =
  'id, name, position, birth_year, club, phone, email, parent_name, parent_phone, school_type, grad_year, grades, english_level, video_url, jersey_number, consent_profile_at, consent_social_at'

export const INVITE_WITH_PLAYER_SELECT = `*, player:showcase_players(${INVITE_PLAYER_SELECT})`

// Until the 20261022000001_selection_invites migration is applied, the table and the new columns are missing.
// The UI shows a banner instead of an error in that case.
export const isMigrationPending = (message: string | undefined): boolean =>
  !!message && /showcase_invites|schema cache|does not exist|jersey_number|school_type|consent_/i.test(message)

export const dbError = (message: string | undefined) =>
  isMigrationPending(message)
    ? NextResponse.json({ error: 'migration_pending', detail: message }, { status: 503 })
    : NextResponse.json({ error: message ?? 'Database error' }, { status: 500 })
