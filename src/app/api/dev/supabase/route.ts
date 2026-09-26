import { NextResponse } from "next/server";

import {
  checkInventoryConnection,
  isInventoryConfigured,
} from "@/features/checkout/inventory";

/**
 * Is the shop actually talking to Supabase?
 *
 *   curl localhost:3000/api/dev/supabase
 *
 * Exercises the real path the checkout uses — the same env lookup, the same
 * `createClient`, the same table — so a pass here means stock checks and order
 * recording will work, not merely that some credentials exist somewhere.
 *
 * Development only. It reports which environment variables are set and reads
 * a table that row level security closes to the public key, so in production
 * it answers 404 like any route that isn't there. Names are reported, never
 * values.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const result = await checkInventoryConnection();

  return NextResponse.json(
    {
      configured: isInventoryConfigured(),
      env: {
        SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
        SUPABASE_SECRET_KEY: Boolean(process.env.SUPABASE_SECRET_KEY),
        SUPABASE_SERVICE_ROLE_KEY: Boolean(
          process.env.SUPABASE_SERVICE_ROLE_KEY,
        ),
      },
      ...result,
    },
    { status: result.ok ? 200 : 500 },
  );
}
