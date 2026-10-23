"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/clientError";

// Replaces the root layout when active, so it renders its own <html> and <body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error, { surface: "app/global-error", digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <h2>Something went wrong</h2>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  );
}
