import { createHash, timingSafeEqual } from 'node:crypto'
import { itpMoveProbe } from '@/lib/itp-target'

// ITP move probe (same contract as the seven app PRs): no-I/O fields to anyone, the one
// move_phase read only with Authorization: Bearer ITP_MOVE_PROBE_TOKEN.
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const token = process.env.ITP_MOVE_PROBE_TOKEN
  // Compare fixed-length digests so unequal token lengths also fail safely.
  const authorized = Boolean(token?.trim()) && timingSafeEqual(
    createHash('sha256').update(request.headers.get('authorization') ?? '').digest(),
    createHash('sha256').update(`Bearer ${token}`).digest(),
  )
  return itpMoveProbe({
    authorized,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    schema: process.env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA,
    deployment: process.env.VERCEL_DEPLOYMENT_ID,
  })
}
