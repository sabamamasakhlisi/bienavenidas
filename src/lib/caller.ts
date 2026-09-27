import { createHash } from "node:crypto";

import { headers } from "next/headers";

/**
 * Who is asking, as far as a public, unauthenticated request can say: their IP
 * address. On Vercel the first `x-forwarded-for` entry is set by the platform,
 * not by the client. Null when there is none, which callers must treat as
 * "unknown" rather than lumping every such request under one name.
 *
 * An IP is not a person (a household, an office, a carrier behind NAT), so use
 * this for brakes sized to let a few people through, never for identity.
 */
export async function callerIp(): Promise<string | null> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || list.get("x-real-ip") || null;
}

/** The caller as an opaque key, for anything that gets stored. */
export async function callerKey(): Promise<string | null> {
  const ip = await callerIp();
  return ip ? createHash("sha256").update(ip).digest("hex") : null;
}
