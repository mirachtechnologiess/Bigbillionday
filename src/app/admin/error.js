"use client";

import AppErrorScreen from "@/components/AppErrorScreen";

// Admin boundary — "home" is the dashboard (/admin is rewritten to / on admin.premiumshopy.com).
export default function AdminError({ error, reset }) {
  return <AppErrorScreen error={error} reset={reset} homeHref="/admin" />;
}
