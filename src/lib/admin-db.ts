import { supabase, itpSchema } from './supabase'
import { createDbProxy, type DbRequest, type DbResult } from './admin-db-core'

// The coordinator screens' table client (all of them sit behind the admin basic auth).
// Today (schema env unset): exactly the direct client, as before.
// Switched to Core: showcase_* is closed to the public key there, so each table call goes to
// /api/admin/db (basic auth + service role). Storage stays on the direct client.
const send = async (req: DbRequest): Promise<DbResult> => {
  const res = await fetch('/api/admin/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    cache: 'no-store',
  })
  const body = await res.json().catch(() => null)
  if (body && typeof body === 'object' && ('data' in body || 'error' in body)) {
    return { data: body.data ?? null, error: body.error ?? null }
  }
  return { data: null, error: { message: `Request failed (${res.status})` } }
}

export const adminDb: typeof supabase =
  itpSchema === 'itp' ? (createDbProxy(send, supabase.storage) as unknown as typeof supabase) : supabase
