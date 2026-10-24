import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { parseCreateBody } from "@/lib/validate";
import { handleApiError } from "@/lib/apiError";
import { isExpenseStatus, type ExpenseStatus } from "@/lib/types";

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const statusParam = params.get("status");
    let status: ExpenseStatus | undefined;
    if (statusParam !== null) {
      if (!isExpenseStatus(statusParam)) {
        return NextResponse.json({ error: "Unknown status" }, { status: 400 });
      }
      status = statusParam;
    }
    const q = params.get("q")?.trim().toLowerCase();

    const result = await store.list({ status, query: q });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, req);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = parseCreateBody(body);
    if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });
    return NextResponse.json(await store.create(parsed.title, parsed.lineItems), { status: 201 });
  } catch (error) {
    return handleApiError(error, req);
  }
}
