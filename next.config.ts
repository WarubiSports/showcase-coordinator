import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  org: "warubi-sports",
  project: "showcase-coordinator",
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
