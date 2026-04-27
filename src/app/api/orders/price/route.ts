import { verifySameOrigin } from "@/lib/security/csrf";
import { NextResponse } from "next/server";
import { priceDraftOrder } from "@/server/order/price-draft-order";
import type { DraftOrderLineInput } from "@/server/order/types";

export async function POST(req: Request) {
  const csrfError = await verifySameOrigin(req);
  if (csrfError) return csrfError;

  try {
    const body = (await req.json()) as DraftOrderLineInput;
    const result = await priceDraftOrder(body);

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to price order";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
