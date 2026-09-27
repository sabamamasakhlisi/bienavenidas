import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The server's Supabase client.
 *
 * One module knows the credentials, because getting their names wrong is a
 * silent failure rather than a loud one: every caller here treats "not
 * configured" as a reason to carry on without the database, so a typo in an
 * environment variable name doesn't raise anything — it just quietly stops
 * checking stock, or quietly stops saving sign-ups.
 *
 * Server only. This key bypasses row level security, so it must never be
 * imported from a module carrying "use client".
 */

let client: SupabaseClient | null = null;

/**
 * The secret key, under either name Supabase has given it.
 *
 * Projects created from 2025 issue `sb_secret_…` keys and the dashboard calls
 * that the secret key; older ones issue a `service_role` JWT. Both bypass row
 * level security and both belong only on the server, so either will do.
 */
function secretKey() {
  return (
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && secretKey());
}

export function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = secretKey();

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are not set",
    );
  }

  client ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return client;
}
