interface ClientErrorContext {
  surface: string;
  digest?: string;
}

export function reportClientError(error: unknown, context: ClientErrorContext) {
  console.error("Client error", { error, ...context });
}
