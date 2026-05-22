"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

let initialized = false;

export function PosthogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (initialized) return;
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    if (typeof window === "undefined") return;
    if (window.location.hostname === "localhost") return;

    posthog.init(key, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: "history_change",
      capture_pageleave: true,
      person_profiles: "identified_only",
    });
    initialized = true;
  }, []);

  return <>{children}</>;
}

export function IdentifyUser({
  userId,
  email,
}: {
  userId: string;
  email?: string | null;
}) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    if (typeof window === "undefined") return;
    if (window.location.hostname === "localhost") return;
    posthog.identify(userId, email ? { email } : undefined);
  }, [userId, email]);

  return null;
}

export function captureEvent(
  name: string,
  properties?: Record<string, unknown>,
) {
  if (typeof window === "undefined") return;
  if (window.location.hostname === "localhost") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.capture(name, properties);
}
