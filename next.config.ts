import type { NextConfig } from "next";

import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
};

// Resolves `./src/i18n/request.ts` by convention.
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
