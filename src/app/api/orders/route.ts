import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createOrderFromCart } from "@/server/order/create-order-from-cart";
import type { DraftOrderLineInput } from "@/server/order/types";
import { verifyTelegram } from "@/lib/verifyTelegram";



function getAllowedTelegramUserIds() {
  return (process.env.ALLOWED_TELEGRAM_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAllowedTelegramUserId(userId: string) {
  return getAllowedTelegramUserIds().includes(userId);
}

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

async function sendTelegramMessage(
  chatId: string,
  text: string,
  extra?: Record<string, unknown>
) {
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
      ...(extra ?? {}),
    }),
  });
}

function formatLines(order: Awaited<ReturnType<typeof createOrderFromCart>>) {
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
  order: Awaited<ReturnType<typeof createOrderFromCart>>,
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
  order: Awaited<ReturnType<typeof createOrderFromCart>>,
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
    `Total: ₦${order.totalAmount.toLocaleString()}`,
    "",
    ...formatLines(order),
  ].join("\n");
}

function operatorActions(orderNumber: string) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Send to Kitchen", callback_data: `sent:${orderNumber}` },
        ],
        [
          { text: "💵 Cash", callback_data: `paid_cash:${orderNumber}` },
          { text: "🏦 Transfer", callback_data: `paid_transfer:${orderNumber}` },
          { text: "💳 POS", callback_data: `paid_pos:${orderNumber}` },
        ],
      ],
    },
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateOrderRequest;

    const cookieStore = await cookies();
    const staffUserIdFromCookie = cookieStore.get("staff_user_id")?.value;

    let orderUser = {
      telegramUserId: body.telegramUserId ?? "",
      firstName: body.firstName ?? null,
      lastName: body.lastName ?? null,
      username: body.username ?? null,
    };

    if (body.telegramUserId && body.initData) {
      if (!verifyTelegram(body.initData, process.env.TELEGRAM_BOT_TOKEN!)) {
        return NextResponse.json({ ok: false }, { status: 401 });
      }

      if (!isAllowedTelegramUserId(body.telegramUserId)) {
        return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 403 });
      }
    } else if (staffUserIdFromCookie) {
      const staffUser = await prisma.staffUser.findUnique({
        where: { id: staffUserIdFromCookie },
      });

      if (!staffUser || !staffUser.isActive) {
        return NextResponse.json({ ok: false, error: "Account disabled" }, { status: 403 });
      }

      orderUser = {
        telegramUserId: staffUser.telegramUserId,
        firstName: staffUser.firstName,
        lastName: staffUser.lastName,
        username: staffUser.username,
      };
    } else {
      return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 403 });
    }

    if (!body.lines?.length) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const order = await createOrderFromCart({
      telegramUserId: orderUser.telegramUserId,
      firstName: orderUser.firstName ?? null,
      lastName: orderUser.lastName ?? null,
      username: orderUser.username ?? null,
      notes: body.notes ?? null,
      tableNumber: body.tableNumber ?? null,
      lines: body.lines,
    });

    const waiterMsg = buildWaiterMessage(order, {
      firstName: orderUser.firstName,
      username: orderUser.username,
    });

    const operatorMsg = buildOperatorMessage(order, {
      firstName: orderUser.firstName,
      username: orderUser.username,
    });

    const waiterChatId = body.telegramUserId;
    const operatorIds = (process.env.OPERATOR_CHAT_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (waiterChatId) {
      await sendTelegramMessage(waiterChatId, waiterMsg);
    }

    for (const opId of operatorIds) {
      await sendTelegramMessage(
        opId,
        operatorMsg,
        operatorActions(order.orderNumber)
      );
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
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error("POST /api/orders failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
