import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { adminOrStaffAuth } from '@/lib/staff-auth'
import { isSameOriginJsonRequest } from '@/lib/admin-db-core'
import { INVITE_WITH_PLAYER_SELECT, dbError } from '@/lib/invite-db'
import { fetchAthlete } from '@/lib/base-athletes'
import { baseInviteFields, definedFields } from '@/lib/base-invite'

export const dynamic = 'force-dynamic'

// Pulls link, photo, club and position from the invite's Base athlete (read only on Base). Same rules as on
// create: the invite's own link stays, only values Base has are written. The staff page runs the FuPa read
// afterwards when the link is a FuPa page, so live FuPa values win again.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await adminOrStaffAuth(req)
  if (denied) return denied
  if (!isSameOriginJsonRequest(req)) return NextResponse.json({ error: 'Same-origin JSON request required' }, { status: 403 })
  const { id } = await params

  const db = createAdminClient()
  const { data: invite, error } = await db.from('showcase_invites').select('id, ausa_athlete_id, profile_url').eq('id', id).maybeSingle()
  if (error) return dbError(error.message)
  if (!invite) return NextResponse.json({ error: 'Einladung nicht gefunden' }, { status: 404 })
  if (typeof invite.ausa_athlete_id !== 'string') return NextResponse.json({ error: 'Die Einladung ist nicht mit Base verknüpft' }, { status: 400 })

  const athlete = await fetchAthlete(db, invite.ausa_athlete_id)
  if (!athlete) return NextResponse.json({ error: 'Athlet in Base nicht gefunden' }, { status: 404 })
  const values = definedFields(baseInviteFields(athlete, typeof invite.profile_url === 'string' ? invite.profile_url : null))

  const { data, error: writeError } = await db
    .from('showcase_invites')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(INVITE_WITH_PLAYER_SELECT)
    .maybeSingle()
  if (writeError) return dbError(writeError.message)
  return NextResponse.json({ ...data, base: { synced: Object.keys(values) } })
}
