import * as Sentry from "@sentry/nextjs";

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: sentryDsn,
  enabled: process.env.NODE_ENV === "production" && Boolean(sentryDsn),
  tracesSampleRate: 0.1,
});
