import { NextResponse } from "next/server";
import { logger } from "./logger";

export function handleApiError(error: unknown, context: { route: string }) {
  logger.error({ err: error, ...context }, "Unhandled API error");
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
