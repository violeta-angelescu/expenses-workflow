import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { logger } from "./logger";

export function handleApiError(error: unknown, request: Request) {
  const url = new URL(request.url);
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const statusCode = 500;
  logger.error(
    {
      err: error,
      requestId,
      method: request.method,
      path: url.pathname,
      statusCode,
      env: process.env.NODE_ENV ?? "development",
    },
    "Unhandled API error",
  );
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: statusCode, headers: { "x-request-id": requestId } },
  );
}
