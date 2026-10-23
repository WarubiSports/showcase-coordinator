import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // The invite API checks public/events/<slug>/hero.jpg on disk; Vercel bundles only traced files into a function
  outputFileTracingIncludes: { "/api/invite/[token]": ["./public/events/**/hero.jpg"] },
};

export default withSentryConfig(nextConfig, {
  org: "warubi-sports",
  project: "showcase-coordinator",
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
