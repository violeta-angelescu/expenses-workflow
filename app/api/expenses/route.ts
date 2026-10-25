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
    const q = params.get("q")?.trim();

    const result = await store.list({ status, query: q });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, req);
  }
}

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const parsed = parseCreateBody(body);
    if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });
    const createdExpense = await store.create(parsed.title, parsed.lineItems);
    return NextResponse.json(createdExpense, { status: 201 });
  } catch (error) {
    return handleApiError(error, req);
  }
}
