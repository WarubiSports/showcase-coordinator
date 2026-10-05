import { createClient } from '@supabase/supabase-js'

// Server-only client (service role, bypasses RLS). Never import from client components.
// Used for showcase_players, which the public (anon) key can only insert into.
export const createAdminClient = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
