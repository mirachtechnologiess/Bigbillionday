"use client";

import AppErrorScreen from "@/components/AppErrorScreen";

// Last-resort boundary (errors in the root layout itself). Must render its own <html>/<body>.
export default function GlobalError({ error, reset }) {
  return (
    <html lang="en-IN">
      <body style={{ margin: 0 }}>
        <AppErrorScreen error={error} reset={reset} />
      </body>
    </html>
  );
}
