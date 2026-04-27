import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const staffUserId = cookieStore.get("staff_user_id")?.value;

  if (!staffUserId) {
    return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, staffUserId },
    include: {
      items: {
        include: {
          modifiers: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, order });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const staffUserId = cookieStore.get("staff_user_id")?.value;

  if (!staffUserId) {
    return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const order = await prisma.order.findFirst({
    where: { id, staffUserId },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  const isOnlyMarkingPaid =
    body.paymentStatus === "PAID" &&
    body.tableNumber === undefined &&
    body.notes === undefined;

  if (order.paymentStatus === "PAID" && !isOnlyMarkingPaid) {
    return NextResponse.json({ ok: false, error: "Paid orders cannot be edited" }, { status: 403 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      tableNumber: body.tableNumber !== undefined ? String(body.tableNumber) : undefined,
      notes: body.notes !== undefined ? String(body.notes) : undefined,
      paymentStatus: body.paymentStatus === "PAID" ? "PAID" : undefined,
      paymentMethod: body.paymentMethod ?? undefined,
    },
  });

  return NextResponse.json({ ok: true, order: updated });
}
