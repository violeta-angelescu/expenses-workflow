import { ApiError } from "./errors";

interface ClientErrorContext {
  surface: string;
  digest?: string;
}

export function getClientErrorMessage(error: unknown): string | null {
  if (error instanceof Error && error.name === "AbortError") return null;
  if (error instanceof ApiError) return error.message;
  return "Something went wrong. Please try again.";
}

export function reportClientError(error: unknown, context: ClientErrorContext) {
  console.error("Client error", { error, ...context });
}
