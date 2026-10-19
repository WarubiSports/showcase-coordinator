import { createClient } from '@supabase/supabase-js'
import { resolveItpTarget } from './itp-target'

// Server-only client (service role, bypasses RLS). Never import from client components.
// Used for showcase_players, which the public (anon) key can only insert into, and /api/admin/db.
export const createAdminClient = () => {
  const target = resolveItpTarget(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA,
  )
  return createClient(target.url, target.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...target.clientOptions[0],
  })
}
