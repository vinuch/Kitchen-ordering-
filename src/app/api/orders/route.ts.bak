import { NextResponse } from "next/server";
import { createOrderFromCart } from "@/server/order/create-order-from-cart";
import type { DraftOrderLineInput } from "@/server/order/types";
import { verifyTelegram } from "@/lib/verifyTelegram";

type CreateOrderRequest = {
  telegramUserId?: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  notes?: string | null;
  tableNumber?: string | null;
  initData?: string;
  lines: DraftOrderLineInput[];
};

type CreatedOrder = Awaited<ReturnType<typeof createOrderFromCart>>;

async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
}

function formatLines(order: CreatedOrder) {
  return order.items.map((item) => {
    const base = `- ${item.quantity}x ${item.menuItemNameSnapshot}`;
    if (!item.modifiers.length) return base;

    const mods = item.modifiers
      .map(
        (m) =>
          `  • ${m.modifierGroupNameSnapshot}: ${m.modifierOptionNameSnapshot} x${m.quantity}`
      )
      .join("\n");

    return `${base}\n${mods}`;
  });
}

function buildWaiterMessage(
  order: CreatedOrder,
  waiter?: { firstName?: string | null; username?: string | null }
) {
  return [
    "🧾 Order Confirmed",
    "",
    `Order: ${order.orderNumber}`,
    `Table: ${order.tableNumber || "N/A"}`,
    `Waiter: ${waiter?.firstName ?? "Unknown"}${
      waiter?.username ? ` (@${waiter.username})` : ""
    }`,
    `Total: ₦${order.totalAmount.toLocaleString()}`,
    "",
    ...formatLines(order),
  ].join("\n");
}

function buildOperatorMessage(
  order: CreatedOrder,
  waiter?: { firstName?: string | null; username?: string | null }
) {
  return [
    "🚨 New Order",
    "",
    `Order: ${order.orderNumber}`,
    `Table: ${order.tableNumber || "N/A"}`,
    `Waiter: ${waiter?.firstName ?? "Unknown"}${
      waiter?.username ? ` (@${waiter.username})` : ""
    }`,
    "",
    ...formatLines(order),
  ].join("\n");
}

function buildChefMessage(order: CreatedOrder) {
  return [
    "👨‍🍳 Kitchen Order",
    "",
    `Order: ${order.orderNumber}`,
    `Table: ${order.tableNumber || "N/A"}`,
    "",
    ...formatLines(order),
  ].join("\n");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateOrderRequest;

    if (!body.telegramUserId || !body.initData) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    if (!verifyTelegram(body.initData, process.env.TELEGRAM_BOT_TOKEN!)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    if (!body.lines?.length) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const order = await createOrderFromCart({
      telegramUserId: body.telegramUserId,
      firstName: body.firstName ?? null,
      lastName: body.lastName ?? null,
      username: body.username ?? null,
      notes: body.notes ?? null,
      tableNumber: body.tableNumber ?? null,
      lines: body.lines,
    });

    const waiterMsg = buildWaiterMessage(order, {
      firstName: body.firstName,
      username: body.username,
    });

    const operatorMsg = buildOperatorMessage(order, {
      firstName: body.firstName,
      username: body.username,
    });

    const chefMsg = buildChefMessage(order);

    await sendTelegramMessage(body.telegramUserId, waiterMsg);

    if (process.env.OPERATOR_CHAT_ID) {
      await sendTelegramMessage(process.env.OPERATOR_CHAT_ID, operatorMsg);
    }

    if (process.env.CHEF_CHAT_ID) {
      await sendTelegramMessage(process.env.CHEF_CHAT_ID, chefMsg);
    }

    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        subtotalAmount: order.subtotalAmount,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
