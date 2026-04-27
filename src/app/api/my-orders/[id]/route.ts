import { requireActiveStaff } from "@/lib/auth/staff";
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
  await requireActiveStaff();

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

  if (body.paymentStatus !== undefined || body.paymentMethod !== undefined) {
    return NextResponse.json({ ok: false, error: "Payment must be confirmed by operator" }, { status: 403 });
  }

  if (order.paymentStatus === "PAID") {
    return NextResponse.json({ ok: false, error: "Paid orders cannot be edited" }, { status: 403 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      tableNumber: body.tableNumber !== undefined ? String(body.tableNumber) : undefined,
      notes: body.notes !== undefined ? String(body.notes) : undefined,
      paymentStatus: undefined,
      paymentMethod: undefined,
    },
  });

  return NextResponse.json({ ok: true, order: updated });
}
