import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { adminOrStaffAuth } from '@/lib/staff-auth'
import { ATHLETE_COLUMNS, signedDates, toPrefill, type BaseAthleteRow } from '@/lib/base-athletes'

export const dynamic = 'force-dynamic'

// Name lookup in Base (public.athletes, same project) for the staff invite form. Admin basic auth,
// service role, read only, at most 8 rows, never the anon key.
export async function GET(req: NextRequest) {
  const { denied } = await adminOrStaffAuth(req)
  if (denied) return denied
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().replace(/[%_,]/g, ' ')
  if (q.length < 2) return NextResponse.json([])

  const db = createAdminClient()
  const { data, error } = await db
    .schema('public')
    .from('athletes')
    .select(ATHLETE_COLUMNS)
    .ilike('full_name', `%${q}%`)
    .is('deleted_at', null)
    .order('full_name')
    .limit(8)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as BaseAthleteRow[]
  const signed = await signedDates(db, rows.map((r) => r.id))
  return NextResponse.json(
    rows.map((r) => {
      const p = toPrefill(r)
      return {
        id: r.id,
        name: p.name ?? '',
        club: p.club,
        birth_year: p.birth_year,
        stage: r.unified_stage,
        phone: p.phone,
        signed: signed.has(r.id),
        signed_date: signed.get(r.id) ?? null,
      }
    }),
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
