import { createHmac } from "node:crypto";
import { isIP } from "node:net";

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

/**
 * The caller's network, for counting: an IPv4 address as it is, an IPv6
 * address cut to its first 64 bits.
 *
 * One home or phone connection is handed a whole IPv6 /64 — billions of
 * addresses — and can pick a fresh one per request. Counted by full address,
 * every request would look like a new visitor and walk straight past any
 * per-visitor limit. The /64 is what a single connection actually owns.
 */
export async function callerNetwork(): Promise<string | null> {
  const ip = await callerIp();
  return ip ? networkOf(ip) : null;
}

export function networkOf(ip: string): string {
  // IPv4 written as IPv6 (`::ffff:1.2.3.4`) is still that IPv4 address.
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return mapped[1];

  if (isIP(ip) !== 6) return ip;

  const [head, tail = ""] = ip.toLowerCase().split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = ip.includes("::")
    ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right]
    : left;

  return `${groups
    .slice(0, 4)
    .map((group) => parseInt(group, 16).toString(16))
    .join(":")}::/64`;
}

/**
 * The caller's network as an opaque key, for anything that gets stored.
 *
 * Keyed, not a bare hash: there are only about four billion IPv4 addresses,
 * so a plain SHA-256 of one can be reversed by trying them all in minutes.
 * With a secret key it can't, as long as the key stays out of the database.
 * The Stripe secret serves as that key — it lives only in Vercel, and this is
 * only ever called on the way to Stripe. Rotating it just forgets the current
 * holds' owners, which are gone within the hour anyway.
 */
export async function callerKey(): Promise<string | null> {
  const network = await callerNetwork();
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!network || !secret) return null;

  return createHmac("sha256", `caller:${secret}`).update(network).digest("hex");
}
