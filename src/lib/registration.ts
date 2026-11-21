import { createClient } from "@supabase/supabase-js";
export function registrationClient() {
 const url=process.env.REGISTRATION_SUPABASE_URL, key=process.env.REGISTRATION_SUPABASE_SECRET_KEY;
 if(!url || !key) throw new Error("Registration database is unavailable.");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
