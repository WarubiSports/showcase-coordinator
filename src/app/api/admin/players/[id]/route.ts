import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { adminAuthError } from '@/lib/admin-auth'

// Admin player update + delete. Protected by the admin basic auth in middleware.

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = adminAuthError(req)
  if (denied) return denied
  const { id } = await params
  const updates = await req.json()
  delete updates.id
  delete updates.created_at

  const { data, error } = await createAdminClient()
    .from('showcase_players')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = adminAuthError(req)
  if (denied) return denied
  const { id } = await params
  const { error } = await createAdminClient().from('showcase_players').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
