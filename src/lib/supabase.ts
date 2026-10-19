import { createClient } from '@supabase/supabase-js'
import { resolveItpTarget } from './itp-target'

// ITP move: NEXT_PUBLIC_SUPABASE_DB_SCHEMA unset = today's ITP project, unchanged.
// "itp" with the Warubi Core URL = Core's itp schema; any other mix refuses to start.
const target = resolveItpTarget(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA,
)

export const itpSchema = target.schema

export const supabase = createClient(target.url, target.key, {
  auth: {
    storageKey: 'showcase-coordinator-auth',
  },
  ...target.clientOptions[0],
})
