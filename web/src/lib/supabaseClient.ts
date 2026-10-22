/**
 * Supabase client initialization for CIPHER AI Frontend.
 *
 * Uses EXCLUSIVELY the client-safe public anonymous key (VITE_SUPABASE_ANON_KEY).
 * Forbidden backend secrets (service role key, JWT secret, LLM key) must NEVER be referenced here.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jipjbaxogqgvcpbxvnit.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_TI7vVkKluhesx8r6Iytiyg_Lp2Oa_OA'

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
