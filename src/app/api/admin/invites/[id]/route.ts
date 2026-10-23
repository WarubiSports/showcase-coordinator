import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { adminAuthError } from '@/lib/admin-auth'
import { INVITE_WITH_PLAYER_SELECT, dbError } from '@/lib/invite-db'
import { isSameOriginJsonRequest } from '@/lib/admin-db-core'
import { PROFILE_URL_ERROR, cleanProfileUrl, isProfileUrl } from '@/lib/profile-url'

// Edit or remove one invite. Staff can reset to invited or mark declined (a WhatsApp "kann nicht");
// accepted only comes from the player's form, because that is where the consent lives.

const clean = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

// Same gate as /api/admin/db: a cross-site form could replay cached Basic credentials
const crossSite = (req: NextRequest) =>
  isSameOriginJsonRequest(req) ? null : NextResponse.json({ error: 'Same-origin JSON request required' }, { status: 403 })

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = adminAuthError(req) ?? crossSite(req)
  if (denied) return denied
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { updated_at: now }

  if ('name' in body) {
    const name = clean(body.name, 120)
    if (!name) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    updates.name = name
  }
  if ('phone' in body) updates.phone = clean(body.phone, 40)
  if ('personal_line' in body) updates.personal_line = clean(body.personal_line, 300)
  if ('profile_url' in body) {
    const profile_url = cleanProfileUrl(body.profile_url)
    if (profile_url && !isProfileUrl(profile_url)) return NextResponse.json({ error: PROFILE_URL_ERROR }, { status: 400 })
    updates.profile_url = profile_url
  }
  if ('invited_by' in body) {
    const by = clean(body.invited_by, 80)
    if (!by) return NextResponse.json({ error: 'invited_by cannot be empty' }, { status: 400 })
    updates.invited_by = by
  }
  if ('status' in body) {
    if (body.status !== 'invited' && body.status !== 'declined') {
      return NextResponse.json({ error: 'status must be invited or declined' }, { status: 400 })
    }
    updates.status = body.status
    updates.responded_at = body.status === 'declined' ? now : null
  }

  const { data, error } = await createAdminClient()
    .from('showcase_invites')
    .update(updates)
    .eq('id', id)
    .select(INVITE_WITH_PLAYER_SELECT)
    .maybeSingle()
  if (error) return dbError(error.message)
  if (!data) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = adminAuthError(req) ?? crossSite(req)
  if (denied) return denied
  const { id } = await params
  const { error } = await createAdminClient().from('showcase_invites').delete().eq('id', id)
  if (error) return dbError(error.message)
  return NextResponse.json({ success: true })
}
