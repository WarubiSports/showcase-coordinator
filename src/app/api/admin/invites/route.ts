import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { adminAuthError } from '@/lib/admin-auth'
import { newInviteToken } from '@/lib/invite-token'
import { INVITE_WITH_PLAYER_SELECT, dbError } from '@/lib/invite-db'

export const dynamic = 'force-dynamic'

// Selection invites for one event: list + create. Admin basic auth (middleware + here).

export async function GET(req: NextRequest) {
  const denied = adminAuthError(req)
  if (denied) return denied
  const eventId = req.nextUrl.searchParams.get('event_id')
  if (!eventId) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const { data, error } = await createAdminClient()
    .from('showcase_invites')
    .select(INVITE_WITH_PLAYER_SELECT)
    .eq('event_id', eventId)
    .order('created_at')
  if (error) return dbError(error.message)
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

interface NewInvite {
  name?: unknown
  phone?: unknown
  invited_by?: unknown
  personal_line?: unknown
}

const clean = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

export async function POST(req: NextRequest) {
  const denied = adminAuthError(req)
  if (denied) return denied
  const body = await req.json().catch(() => null)
  const eventId = clean(body?.eventId, 60)
  const rows: NewInvite[] = Array.isArray(body?.invites) ? body.invites : []
  if (!eventId || rows.length === 0) return NextResponse.json({ error: 'eventId and invites required' }, { status: 400 })
  if (rows.length > 100) return NextResponse.json({ error: 'Max 100 invites per request' }, { status: 400 })

  const inserts: { event_id: string; token: string; name: string; phone: string | null; invited_by: string; personal_line: string | null }[] = []
  for (const r of rows) {
    const name = clean(r.name, 120)
    const invited_by = clean(r.invited_by, 80)
    if (!name || !invited_by) return NextResponse.json({ error: 'Each invite needs a name and an inviter' }, { status: 400 })
    inserts.push({
      event_id: eventId,
      token: newInviteToken(),
      name,
      phone: clean(r.phone, 40),
      invited_by,
      personal_line: clean(r.personal_line, 300),
    })
  }

  const { data, error } = await createAdminClient().from('showcase_invites').insert(inserts).select(INVITE_WITH_PLAYER_SELECT)
  if (error) return dbError(error.message)
  return NextResponse.json(data)
}
