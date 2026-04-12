import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type UpdateOrderBody = {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
};

const allowedOrderStatuses: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PREPARING,
  OrderStatus.COMPLETED,
];

const allowedPaymentStatuses: PaymentStatus[] = [
  PaymentStatus.UNPAID,
  PaymentStatus.PAID,
];

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as UpdateOrderBody;

    const data: Partial<{
      status: OrderStatus;
      paymentStatus: PaymentStatus;
    }> = {};

    if (body.status !== undefined) {
      if (!allowedOrderStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: "Invalid order status" },
          { status: 400 }
        );
      }
      data.status = body.status;
    }

    if (body.paymentStatus !== undefined) {
      if (!allowedPaymentStatuses.includes(body.paymentStatus)) {
        return NextResponse.json(
          { error: "Invalid payment status" },
          { status: 400 }
        );
      }
      data.paymentStatus = body.paymentStatus;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided" },
        { status: 400 }
      );
    }

    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      select: {
        id: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: existingOrder.id },
      data,
      include: {
        staffUser: true,
        items: {
          include: {
            modifiers: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("PATCH /api/admin/orders/[id] error:", error);

    return NextResponse.json(
      {
        error: "Failed to update order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
