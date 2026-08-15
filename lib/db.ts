import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Server-side Supabase client using the service role key. Never import this in client components. */
export function db(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const missing = [!url && "SUPABASE_URL", !key && "SUPABASE_SERVICE_ROLE_KEY"].filter(Boolean);
    if (missing.length) {
      throw new Error(`Missing environment variables: ${missing.join(", ")}`);
    }
    if (url!.includes("xxxx") || key!.length < 40) {
      throw new Error(
        "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY still holds a placeholder value. Check .env.local."
      );
    }
    client = createClient(url!, key!, { auth: { persistSession: false } });
  }
  return client;
}
