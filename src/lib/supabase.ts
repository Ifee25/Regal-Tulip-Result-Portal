import { createClient } from "@supabase/supabase-js";

function stripQuotes(v?: string) {
  if (!v) return v;
  return v.replace(/^"|"$/g, "");
}

const supabaseUrl = stripQuotes(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = stripQuotes(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null;

// Note: callers should handle `null` in environments where the env vars are not set.
