import { prisma } from "@/lib/prisma";
import { priceDraftOrder } from "@/server/order/price-draft-order";
import type { DraftOrderLineInput } from "@/server/order/types";

type CreateOrderFromCartInput = {
  telegramUserId: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  notes?: string | null;
  tableNumber?: string | null;
  lines: DraftOrderLineInput[];
};

function generateOrderNumber() {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ];

  return `ORD-${parts.join("")}`;
}

export async function createOrderFromCart(input: CreateOrderFromCartInput) {
  if (!input.lines.length) {
    throw new Error("At least one order line is required");
  }

  const pricedLines = await Promise.all(
    input.lines.map((line) => priceDraftOrder(line))
  );

  const subtotalAmount = pricedLines.reduce(
    (sum, priced) => sum + priced.subtotal,
    0
  );

  const totalAmount = pricedLines.reduce(
    (sum, priced) => sum + priced.total,
    0
  );

  const staffUser = await prisma.staffUser.upsert({
    where: {
      telegramUserId: input.telegramUserId,
    },
    update: {
      firstName: input.firstName ?? "Staff",
      lastName: input.lastName ?? null,
      username: input.username ?? null,
      isActive: true,
    },
    create: {
      telegramUserId: input.telegramUserId,
      firstName: input.firstName ?? "Staff",
      lastName: input.lastName ?? null,
      username: input.username ?? null,
      isActive: true,
    },
  });

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      staffUserId: staffUser.id,
      tableNumber: input.tableNumber ?? null,
      status: "PENDING",
      paymentStatus: "UNPAID",
      subtotalAmount,
      totalAmount,
      notes: input.notes ?? null,
      items: {
        create: pricedLines.map((priced) => ({
          menuItemId: priced.line.menuItemId,
          menuItemNameSnapshot: priced.line.menuItemName,
          unitPriceSnapshot: priced.line.basePrice,
          quantity: priced.line.quantity,
          lineTotal: priced.line.lineTotal,
          modifiers: {
            create: priced.line.selections.map((selection) => ({
              modifierOptionId: selection.modifierOptionId,
              modifierGroupNameSnapshot: selection.modifierGroupName,
              modifierOptionNameSnapshot: selection.modifierOptionName,
              priceDeltaSnapshot: selection.priceDelta,
              quantity: selection.quantity,
            })),
          },
        })),
      },
    },
    include: {
      items: {
        include: {
          modifiers: true,
        },
      },
    },
  });

  return order;
}
