import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

const isProduction = process.env.NODE_ENV === "production";
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_ye5SfajjJFkrj8C8cExzZG34ft4Xha8LjNiHc6RYaavL';
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

Sentry.init({
  dsn: sentryDsn,
  enabled: isProduction && Boolean(sentryDsn),
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});

if (isProduction && posthogKey && typeof window !== "undefined") {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    person_profiles: "identified_only",
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "*",
      blockSelector: "[data-private], .ph-no-capture",
    },
    loaded: (client) => {
      window.addEventListener("error", (event) => {
        client.capture("client_error", {
          message: event.message,
          source: event.filename,
          line: event.lineno,
        });
      });
    },
  });

  (window as unknown as { posthog: typeof posthog }).posthog = posthog;
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
