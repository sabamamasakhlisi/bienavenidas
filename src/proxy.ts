import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  isLocale,
  negotiateLocale,
} from "@/i18n/config";

/**
 * Locale persistence.
 *
 * This is the Next.js 16 `proxy` convention — the former `middleware.ts`, which
 * was deprecated and renamed in v16.0.0 (the logic is unchanged).
 *
 * Its only job is to remember the locale we negotiated for a first-time
 * visitor. It never redirects and never rewrites: the URL that comes in is the
 * URL that goes out, which is what keeps `/libros` serving both languages.
 * Detection itself lives in `src/i18n/config.ts` and is also called from
 * `src/i18n/request.ts`, so the two can never disagree.
 */
export function proxy(request: NextRequest) {
  const stored = request.cookies.get(LOCALE_COOKIE)?.value;

  if (isLocale(stored)) {
    return NextResponse.next();
  }

  const locale = negotiateLocale(
    request.headers.get("accept-language"),
    request.headers.get("x-vercel-ip-country"),
  );

  const response = NextResponse.next();
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: LOCALE_COOKIE_MAX_AGE,
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Every request path except:
     * - api (route handlers)
     * - _next/static, _next/image (build output)
     * - metadata and static assets in public/
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
