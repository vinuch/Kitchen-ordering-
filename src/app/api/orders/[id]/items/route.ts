import { requireActiveStaff } from "@/lib/auth/staff";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

type LineInput = {
  menuItemId: string;
  quantity: number;
  selections: {
    modifierOptionId: string;
    quantity: number;
  }[];
};

async function assertOwnOrder(orderId: string) {
  const cookieStore = await cookies();
  const staffUserId = cookieStore.get("staff_user_id")?.value;

  if (!staffUserId) return null;

  return prisma.order.findFirst({
    where: { id: orderId, staffUserId },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireActiveStaff();

  const { id: orderId } = await params;
  const body = await req.json();

  const order = await assertOwnOrder(orderId);
  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  if (order.paymentStatus === "PAID") {
    return NextResponse.json({ ok: false, error: "Paid orders cannot be edited" }, { status: 403 });
  }

  const lines = (body.lines ?? []) as LineInput[];
  const tableNumber = String(body.tableNumber ?? "").trim();

  if (!tableNumber) {
    return NextResponse.json({ ok: false, error: "Enter a table number" }, { status: 400 });
  }

  if (!lines.length) {
    return NextResponse.json({ ok: false, error: "Add at least one item" }, { status: 400 });
  }

  let subtotal = 0;

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({
      where: { orderId },
    });

    for (const line of lines) {
      const menuItem = await tx.menuItem.findUnique({
        where: { id: line.menuItemId },
      });

      if (!menuItem) continue;

      const selected = line.selections.filter((s) => s.quantity > 0);

      const options = await tx.modifierOption.findMany({
        where: {
          id: { in: selected.map((s) => s.modifierOptionId) },
        },
        include: {
          modifierGroup: true,
        },
      });

      const optionTotal = selected.reduce((sum, selection) => {
        const option = options.find((o) => o.id === selection.modifierOptionId);
        return sum + (option?.priceDelta ?? 0) * selection.quantity;
      }, 0);

      const quantity = Math.max(1, Number(line.quantity || 1));
      const unitTotal = menuItem.price + optionTotal;
      const lineTotal = unitTotal * quantity;
      subtotal += lineTotal;

      const orderItem = await tx.orderItem.create({
        data: {
          orderId,
          menuItemId: menuItem.id,
          menuItemNameSnapshot: menuItem.name,
          unitPriceSnapshot: unitTotal,
          quantity,
          lineTotal,
        },
      });

      for (const selection of selected) {
        const option = options.find((o) => o.id === selection.modifierOptionId);
        if (!option) continue;

        await tx.orderItemModifier.create({
          data: {
            orderItemId: orderItem.id,
            modifierOptionId: option.id,
            modifierGroupNameSnapshot: option.modifierGroup.name,
            modifierOptionNameSnapshot: option.name,
            priceDeltaSnapshot: option.priceDelta,
            quantity: selection.quantity,
          },
        });
      }
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        tableNumber,
        subtotalAmount: subtotal,
        totalAmount: subtotal,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
