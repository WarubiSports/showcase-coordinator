import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { adminAuthError } from '@/lib/admin-auth'
import { DbRequestError, parseDbRequest, runDbRequest } from '@/lib/admin-db-core'

// The coordinator screens' table calls once switched to Core (see src/lib/admin-db.ts).
// Protected by the admin basic auth in middleware and again here; only the listed showcase_*
// tables and the select/insert/update/delete shapes the screens use; no raw SQL.

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const denied = adminAuthError(req)
  if (denied) return denied

  let parsed
  try {
    parsed = parseDbRequest(await req.json())
  } catch (err) {
    const message = err instanceof DbRequestError ? err.message : 'Invalid request'
    return NextResponse.json({ data: null, error: { message } }, { status: 400 })
  }

  const result = await runDbRequest(createAdminClient(), parsed)
  return NextResponse.json(result, { status: result.error ? 500 : 200 })
}
