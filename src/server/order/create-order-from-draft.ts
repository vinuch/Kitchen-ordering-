import { prisma } from "@/lib/prisma";
import { priceDraftOrder } from "@/server/order/price-draft-order";
import type { DraftOrderLineInput } from "@/server/order/types";

type CreateOrderFromDraftInput = {
  telegramUserId: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  notes?: string | null;
  line: DraftOrderLineInput;
};

export async function createOrderFromDraft(input: CreateOrderFromDraftInput) {
  const priced = await priceDraftOrder(input.line);

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
      staffCode: `TG-${input.telegramUserId}`,
      firstName: input.firstName ?? "Staff",
      lastName: input.lastName ?? null,
      username: input.username ?? null,
      isActive: true,
    },
  });

  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-${Date.now()}`,
      staffUserId: staffUser.id,
      status: "PENDING",
      paymentStatus: "UNPAID",
      subtotalAmount: priced.subtotal,
      totalAmount: priced.total,
      notes: input.notes ?? null,
      items: {
        create: [
          {
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
          },
        ],
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
