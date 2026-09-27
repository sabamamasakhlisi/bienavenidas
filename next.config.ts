import type { NextConfig } from "next";

import createNextIntlPlugin from "next-intl/plugin";

const isDev = process.env.NODE_ENV === "development";

// Vercel's preview toolbar (comments, feedback) loads from vercel.live and
// only appears on preview deployments; production never allows it.
const vercelLive =
  process.env.VERCEL_ENV === "preview" ? " https://vercel.live" : "";

/**
 * Content Security Policy.
 *
 * Everything the site uses is served from its own origin: scripts, styles,
 * fonts, covers and the poster. Payment happens on Stripe's own page, reached
 * by a plain navigation, so Stripe needs no entry here.
 *
 * Scripts keep 'unsafe-inline' because Next.js inlines its bootstrap scripts;
 * the alternative is a per-request nonce, which forbids static rendering.
 * The policy still stops scripts and connections from any other origin, and
 * forbids framing, plugins and <base> hijacking.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${vercelLive}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self'${vercelLive}`,
  `frame-src 'self'${vercelLive}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Covered by frame-ancestors above; kept for browsers that predate it.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Two years, this host only: other subdomains of the final domain may not
  // serve HTTPS, so includeSubDomains is left for whoever owns them to add.
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

// Resolves `./src/i18n/request.ts` by convention.
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
