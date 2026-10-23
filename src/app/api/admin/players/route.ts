import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { adminAuthError } from '@/lib/admin-auth'

// Admin player list + create. Protected by the admin basic auth in middleware.

export async function GET(req: NextRequest) {
  const denied = adminAuthError(req)
  if (denied) return denied
  const { searchParams } = req.nextUrl
  const eventId = searchParams.get('event_id')
  if (!eventId) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  let query = createAdminClient().from('showcase_players').select('*').eq('event_id', eventId).order('name')
  const position = searchParams.get('position')
  const search = searchParams.get('search')
  if (position) query = query.eq('position', position)
  if (search) query = query.ilike('name', `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const denied = adminAuthError(req)
  if (denied) return denied
  const { eventId, player } = await req.json()
  if (!eventId || !player?.name) return NextResponse.json({ error: 'eventId and player.name required' }, { status: 400 })

  const { data, error } = await createAdminClient()
    .from('showcase_players')
    .insert([{ ...player, event_id: eventId }])
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
