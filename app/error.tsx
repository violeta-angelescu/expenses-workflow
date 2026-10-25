"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Alert } from "@/components/Alert";
import { reportClientError } from "@/lib/clientError";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error, { surface: "app/error", digest: error.digest });
  }, [error]);

  return (
    <Alert title="Something went wrong">
      <span>An unexpected error occurred.</span>
      <Button variant="outline" onClick={reset}>Try again</Button>
    </Alert>
  );
}
