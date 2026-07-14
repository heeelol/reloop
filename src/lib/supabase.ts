import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// When these aren't set (e.g. before the backend is provisioned) the app runs
// in local/demo mode with mock data. Once set, it goes fully live.
export const hasSupabase = Boolean(url && anon)

export const supabase = hasSupabase ? createClient(url!, anon!) : null
