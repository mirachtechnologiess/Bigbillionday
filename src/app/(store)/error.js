"use client";

import AppErrorScreen from "@/components/AppErrorScreen";

export default function StoreError({ error, reset }) {
  return <AppErrorScreen error={error} reset={reset} />;
}
