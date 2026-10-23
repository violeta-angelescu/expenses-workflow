"use client"; // Error boundaries must be Client Components

import { Alert } from "@/components/Alert";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <Alert title="Something went wrong">
      <span>An unexpected error occurred.</span>
      <button className="secondary" onClick={() => retry()}>Try again</button>
    </Alert>
  );
}
