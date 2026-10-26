import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { adminOrStaffAuth } from '@/lib/staff-auth'
import { isSameOriginJsonRequest } from '@/lib/admin-db-core'
import { INVITE_WITH_PLAYER_SELECT, dbError } from '@/lib/invite-db'
import { crestUpdateFor } from '@/lib/club-crest-server'
import type { FupaInviteStats } from '@/types'

export const dynamic = 'force-dynamic'

// "Vereinswappen laden": the club's crest for an invite with a club but no photo, from FuPa's club search.
// Nothing is written when a photo exists or no club matches exactly.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await adminOrStaffAuth(req)
  if (denied) return denied
  if (!isSameOriginJsonRequest(req)) return NextResponse.json({ error: 'Same-origin JSON request required' }, { status: 403 })
  const { id } = await params

  const db = createAdminClient()
  const { data: invite, error } = await db.from('showcase_invites').select('id, photo_url, club, stats').eq('id', id).maybeSingle()
  if (error) return dbError(error.message)
  if (!invite) return NextResponse.json({ error: 'Einladung nicht gefunden' }, { status: 404 })

  const crest = await crestUpdateFor({ photo_url: (invite.photo_url ?? null) as string | null, club: (invite.club ?? null) as string | null, stats: (invite.stats ?? null) as FupaInviteStats | null })
  const query = crest ? db.from('showcase_invites').update({ ...crest, updated_at: new Date().toISOString() }).eq('id', id) : db.from('showcase_invites')
  const { data, error: readError } = await query.select(INVITE_WITH_PLAYER_SELECT).eq('id', id).maybeSingle()
  if (readError) return dbError(readError.message)
  return NextResponse.json({ ...data, crest: crest ? { url: crest.stats.club_crest } : { url: null } })
}
