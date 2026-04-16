import { NextResponse } from "next/server";
import { createOrderFromCart } from "@/server/order/create-order-from-cart";
import type { DraftOrderLineInput } from "@/server/order/types";

type CreateOrderRequest = {
  telegramUserId?: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  notes?: string | null;
  lines: DraftOrderLineInput[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateOrderRequest;

    if (!body.telegramUserId) {
      return NextResponse.json(
        {
          ok: false,
          error: "telegramUserId is required",
        },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "lines must contain at least one item",
        },
        { status: 400 },
      );
    }

    const order = await createOrderFromCart({
      telegramUserId: body.telegramUserId,
      firstName: body.firstName ?? null,
      lastName: body.lastName ?? null,
      username: body.username ?? null,
      notes: body.notes ?? null,
      lines: body.lines,
    });

    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        subtotalAmount: order.subtotalAmount,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create order";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
