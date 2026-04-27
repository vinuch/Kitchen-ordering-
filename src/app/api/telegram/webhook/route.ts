import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

function getAllowedTelegramUserIds() {
  return (process.env.ALLOWED_TELEGRAM_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAllowedTelegramUserId(userId: string) {
  return getAllowedTelegramUserIds().includes(userId);
}


async function tgCall(method: string, payload: Record<string, unknown>) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    if (!res.ok) {
      console.error(`${method} failed:`, text);
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (error) {
    console.error(`${method} exception:`, error);
    return null;
  }
}

async function sendMessage(
  chatId: string,
  text: string,
  extra?: Record<string, unknown>
) {
  return tgCall("sendMessage", {
    chat_id: chatId,
    text,
    ...(extra ?? {}),
  });
}

async function answerCallbackQuery(callbackQueryId: string, text: string) {
  return tgCall("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
}

function paymentLabel(method: string | null | undefined) {
  if (method === "CASH") return "💵 Cash";
  if (method === "TRANSFER") return "🏦 Transfer";
  if (method === "POS") return "💳 POS";
  return "💰 Paid";
}

function chefActions(orderNumber: string) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "👨‍🍳 Accept Order",
            callback_data: `accept:${orderNumber}`,
          },
        ],
      ],
    },
  };
}

function actionKeyboard(
  orderNumber: string,
  status: string,
  paymentStatus: string,
  paymentMethod?: string | null
) {
  const sentDone = status !== "PENDING";
  const paidDone = paymentStatus === "PAID";

  return {
    reply_markup: {
      inline_keyboard: paidDone
        ? [
            [
              {
                text: sentDone ? `✅ Sent ${orderNumber}` : "✅ Send",
                callback_data: sentDone ? `noop:${orderNumber}` : `sent:${orderNumber}`,
              },
            ],
            [
              {
                text: `${paymentLabel(paymentMethod)} ${orderNumber}`,
                callback_data: `noop:${orderNumber}`,
              },
            ],
          ]
        : [
            [
              {
                text: sentDone ? `✅ Sent ${orderNumber}` : "✅ Send",
                callback_data: sentDone ? `noop:${orderNumber}` : `sent:${orderNumber}`,
              },
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

async function editInlineButtons(
  chatId: string,
  messageId: number,
  orderNumber: string,
  status: string,
  paymentStatus: string,
  paymentMethod?: string | null
) {
  return tgCall("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    ...actionKeyboard(orderNumber, status, paymentStatus, paymentMethod),
  });
}

function formatCurrency(n: number) {
  return `₦${n.toLocaleString()}`;
}

function buildChefMessage(order: {
  orderNumber: string;
  tableNumber: string | null;
  totalAmount: number;
  items: Array<{
    quantity: number;
    menuItemNameSnapshot: string;
    modifiers: Array<{
      modifierGroupNameSnapshot: string;
      modifierOptionNameSnapshot: string;
      quantity: number;
    }>;
  }>;
}) {
  const lines =
    order.items?.map((item) => {
      const base = `- ${item.quantity}x ${item.menuItemNameSnapshot}`;
      if (!item.modifiers.length) return base;

      const mods = item.modifiers
        .map(
          (m) =>
            `  • ${m.modifierGroupNameSnapshot}: ${m.modifierOptionNameSnapshot} x${m.quantity}`
        )
        .join("\n");

      return `${base}\n${mods}`;
    }) ?? [];

  return [
    "👨‍🍳 Kitchen Order",
    "",
    "⚡ First to accept gets the order",
    "",
    `Order: ${order.orderNumber}`,
    `Table: ${order.tableNumber || "N/A"}`,
    `Total: ${formatCurrency(order.totalAmount)}`,
    "",
    ...lines,
  ].join("\n");
}

async function notifyChefsForOrder(orderNumber: string) {
  const chefIds = (process.env.CHEF_CHAT_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!chefIds.length) return;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: {
        include: {
          modifiers: true,
        },
      },
    },
  });

  if (!order) return;

  const chefMsg = buildChefMessage(order);

  for (const chefId of chefIds) {
    await sendMessage(chefId, chefMsg, chefActions(order.orderNumber));
  }
}

async function handleStart(chatId: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/tg/order?v=10`;

  await sendMessage(chatId, "Welcome to Kitchen Bot 👨‍🍳", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📝 New Order",
            web_app: { url },
          },
        ],
      ],
    },
  });
}

async function handleSummary(chatId: string) {
  const now = new Date();
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: from,
        lte: to,
      },
    },
    select: {
      totalAmount: true,
      paymentStatus: true,
      paymentMethod: true,
    },
  });

  const total = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const paid = orders.filter((o) => o.paymentStatus === "PAID");
  const unpaid = orders.filter((o) => o.paymentStatus !== "PAID");

  const cash = paid
    .filter((o) => o.paymentMethod === "CASH")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const transfer = paid
    .filter((o) => o.paymentMethod === "TRANSFER")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const pos = paid
    .filter((o) => o.paymentMethod === "POS")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const unknown = paid
    .filter((o) => !o.paymentMethod)
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const paidTotal = paid.reduce((sum, o) => sum + o.totalAmount, 0);
  const unpaidTotal = unpaid.reduce((sum, o) => sum + o.totalAmount, 0);

  const message = [
    "📊 Today’s Sales",
    "",
    `Total Orders: ${orders.length}`,
    `Total Revenue: ${formatCurrency(total)}`,
    "",
    `💵 Cash: ${formatCurrency(cash)}`,
    `🏦 Transfer: ${formatCurrency(transfer)}`,
    `💳 POS: ${formatCurrency(pos)}`,
    `${unknown > 0 ? "⚠️" : "❔"} Unknown: ${formatCurrency(unknown)}`,
    "",
    `✅ Paid: ${formatCurrency(paidTotal)}`,
    `⏳ Unpaid: ${formatCurrency(unpaidTotal)}`,
  ].join("\n");

  await sendMessage(chatId, message);
}

async function handleUnpaid(chatId: string) {
  const orders = await prisma.order.findMany({
    where: {
      paymentStatus: "UNPAID",
    },
    select: {
      orderNumber: true,
      tableNumber: true,
      totalAmount: true,
      status: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 10,
  });

  if (orders.length === 0) {
    await sendMessage(chatId, "✅ No unpaid orders.");
    return;
  }

  const message = [
    "⏳ Unpaid Orders",
    "",
    ...orders.map(
      (o) =>
        `${o.orderNumber} — Table ${o.tableNumber || "N/A"} — ${formatCurrency(
          o.totalAmount
        )} — ${o.status}`
    ),
  ].join("\n");

  await sendMessage(chatId, message);
}

async function handleCancelCommand(chatId: string, text: string) {
  const parts = text.trim().split(/\s+/);
  const orderNumber = parts[1];

  if (!orderNumber) {
    await sendMessage(chatId, "❌ Usage: /cancel ORD-XXXX");
    return;
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
  });

  if (!order) {
    await sendMessage(chatId, "❌ Order not found");
    return;
  }

  if (order.paymentStatus === "PAID") {
    await sendMessage(chatId, "⚠️ Cannot cancel a paid order");
    return;
  }

  await prisma.order.delete({
    where: { orderNumber },
  });

  await sendMessage(chatId, `🗑️ Order ${orderNumber} cancelled`);
}

async function handleSentCommand(chatId: string, text: string) {
  const parts = text.trim().split(/\s+/);
  const orderNumber = parts[1];

  if (!orderNumber) {
    await sendMessage(chatId, "❌ Usage: /sent ORD-XXXX");
    return;
  }

  const result = await prisma.order.updateMany({
    where: { orderNumber, status: "PENDING" },
    data: { status: "PREPARING" },
  });

  if (result.count === 0) {
    const existing = await prisma.order.findUnique({ where: { orderNumber } });
    if (!existing) {
      await sendMessage(chatId, "❌ Order not found");
      return;
    }
    await sendMessage(chatId, "⚠️ Order already sent or completed");
    return;
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { staffUser: true },
  });

  if (!order) {
    await sendMessage(chatId, "❌ Order not found");
    return;
  }

  await sendMessage(
    chatId,
    `✅ Order sent to kitchen\n\nOrder: ${order.orderNumber}\nTable: ${order.tableNumber || "N/A"}`
  );

  await notifyChefsForOrder(orderNumber);

  if (order.staffUser.telegramUserId !== chatId) {
    await sendMessage(
      order.staffUser.telegramUserId,
      `👨‍🍳 Your order is now being prepared\n\nOrder: ${order.orderNumber}\nTable: ${order.tableNumber || "N/A"}`
    );
  }
}

async function handleSentCallback(
  callbackQueryId: string,
  chatId: string,
  messageId: number,
  orderNumber: string
) {
  await answerCallbackQuery(callbackQueryId, "Processing...");

  const result = await prisma.order.updateMany({
    where: { orderNumber, status: "PENDING" },
    data: { status: "PREPARING" },
  });

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { staffUser: true },
  });

  if (!order) {
    await answerCallbackQuery(callbackQueryId, "Order not found");
    return;
  }

  if (result.count === 0) {
    await answerCallbackQuery(callbackQueryId, "Order already sent");
    return;
  }

  await editInlineButtons(
    chatId,
    messageId,
    order.orderNumber,
    "PREPARING",
    order.paymentStatus,
    order.paymentMethod
  );

  await notifyChefsForOrder(orderNumber);

  await answerCallbackQuery(callbackQueryId, "Order sent to kitchen");

  if (order.staffUser.telegramUserId !== chatId) {
    await sendMessage(
      order.staffUser.telegramUserId,
      `👨‍🍳 Your order is now being prepared\n\nOrder: ${order.orderNumber}\nTable: ${order.tableNumber || "N/A"}`
    );
  }
}

async function handleAcceptCallback(
  callbackQueryId: string,
  chatId: string,
  messageId: number,
  orderNumber: string,
  telegramUser: { id?: number; username?: string; first_name?: string }
) {
  await answerCallbackQuery(callbackQueryId, "Processing...");

  const chefId = telegramUser.id ? String(telegramUser.id) : null;
  const chefName = telegramUser.username
    ? `@${telegramUser.username}`
    : telegramUser.first_name || "Unknown";

  if (!chefId) {
    await answerCallbackQuery(callbackQueryId, "Could not identify chef");
    return;
  }

  const result = await prisma.order.updateMany({
    where: {
      orderNumber,
      status: "PREPARING",
      assignedChefTelegramUserId: null,
    },
    data: {
      assignedChefTelegramUserId: chefId,
      assignedChefName: chefName,
      assignedAt: new Date(),
    },
  });

  if (result.count === 0) {
    await answerCallbackQuery(callbackQueryId, "❌ Already taken");
    return;
  }

  await tgCall("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: `👨‍🍳 Order accepted\n\nOrder: ${orderNumber}\nAssigned to ${chefName}`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "✅ Order Sent Out / Completed", callback_data: `complete:${orderNumber}` }],
      ],
    },
  });

  await answerCallbackQuery(callbackQueryId, "✅ You accepted this order");
}

async function handlePaidCallback(
  callbackQueryId: string,
  chatId: string,
  messageId: number,
  orderNumber: string,
  paymentMethod: "CASH" | "TRANSFER" | "POS"
) {
  await answerCallbackQuery(callbackQueryId, "Processing...");

  const result = await prisma.order.updateMany({
    where: { orderNumber, paymentStatus: "UNPAID" },
    data: {
      paymentStatus: "PAID",
      paymentMethod,
    },
  });

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { staffUser: true },
  });

  if (!order) {
    await answerCallbackQuery(callbackQueryId, "Order not found");
    return;
  }

  if (result.count === 0) {
    await answerCallbackQuery(callbackQueryId, "Order already marked paid");
    return;
  }

  await editInlineButtons(
    chatId,
    messageId,
    order.orderNumber,
    order.status,
    "PAID",
    paymentMethod
  );

  await answerCallbackQuery(callbackQueryId, `${paymentLabel(paymentMethod)} recorded`);

  await sendMessage(
    chatId,
    `${paymentLabel(paymentMethod)} recorded\n\nOrder: ${order.orderNumber}\nTable: ${order.tableNumber || "N/A"}`
  );

  if (order.staffUser.telegramUserId !== chatId) {
    await sendMessage(
      order.staffUser.telegramUserId,
      `✅ ${paymentLabel(paymentMethod)} received\n\nOrder: ${order.orderNumber}\nTable: ${order.tableNumber || "N/A"}`
    );
  }
}

async function handleCompleteCallback(
  callbackQueryId: string,
  chatId: string,
  messageId: number,
  orderNumber: string
) {
  await answerCallbackQuery(callbackQueryId, "Processing...");

  const result = await prisma.order.updateMany({
    where: {
      orderNumber,
      status: { not: "COMPLETED" },
    },
    data: { status: "COMPLETED" },
  });

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { staffUser: true },
  });

  if (!order) {
    await answerCallbackQuery(callbackQueryId, "Order not found");
    return;
  }

  if (result.count === 0) {
    await answerCallbackQuery(callbackQueryId, "Order already completed");
    return;
  }

  await tgCall("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: {
      inline_keyboard: [[{ text: "✅ Completed", callback_data: `noop:${orderNumber}` }]],
    },
  });

  await sendMessage(
    chatId,
    `✅ Order completed\n\nOrder: ${order.orderNumber}\nTable: ${order.tableNumber || "N/A"}`
  );

  if (order.staffUser.telegramUserId && order.staffUser.telegramUserId !== chatId) {
    await sendMessage(
      order.staffUser.telegramUserId,
      `✅ Order completed\n\nOrder: ${order.orderNumber}\nTable: ${order.tableNumber || "N/A"}`
    );
  }

  await answerCallbackQuery(callbackQueryId, "Order completed");
}


export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message = body.message;
    const callbackQuery = body.callback_query;

    if (message?.from?.id) {
      const userId = String(message.from.id);
      if (!isAllowedTelegramUserId(userId)) {
        return NextResponse.json({ ok: true });
      }
    }

    if (callbackQuery?.from?.id) {
      const userId = String(callbackQuery.from.id);
      if (!isAllowedTelegramUserId(userId)) {
        await answerCallbackQuery(callbackQuery.id, "Not authorized");
        return NextResponse.json({ ok: true });
      }
    }


    if (message?.text) {
      const chatId = String(message.chat.id);
      const text = message.text.trim();

      if (text === "/start") {
        await handleStart(chatId);
        return NextResponse.json({ ok: true });
      }

      if (text === "/summary") {
        await handleSummary(chatId);
        return NextResponse.json({ ok: true });
      }

      if (text === "/unpaid") {
        await handleUnpaid(chatId);
        return NextResponse.json({ ok: true });
      }

      if (text.startsWith("/cancel")) {
        await handleCancelCommand(chatId, text);
        return NextResponse.json({ ok: true });
      }

      if (text.startsWith("/sent")) {
        await handleSentCommand(chatId, text);
        return NextResponse.json({ ok: true });
      }
    }

    if (callbackQuery?.data) {
      const data = String(callbackQuery.data);
      const chatId = String(callbackQuery.message.chat.id);
      const messageId = Number(callbackQuery.message.message_id);
      const callbackQueryId = String(callbackQuery.id);

      if (data === "NEW_ORDER") {
        await sendMessage(chatId, "Use the 📝 New Order button to open the Mini App.");
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("sent:")) {
        const orderNumber = data.replace("sent:", "");
        await handleSentCallback(callbackQueryId, chatId, messageId, orderNumber);
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("accept:")) {
        const orderNumber = data.replace("accept:", "");
        await handleAcceptCallback(
          callbackQueryId,
          chatId,
          messageId,
          orderNumber,
          callbackQuery.from
        );
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("complete:")) {
        const orderNumber = data.replace("complete:", "");
        await handleCompleteCallback(callbackQueryId, chatId, messageId, orderNumber);
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("paid_cash:")) {
        const orderNumber = data.replace("paid_cash:", "");
        await handlePaidCallback(callbackQueryId, chatId, messageId, orderNumber, "CASH");
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("paid_transfer:")) {
        const orderNumber = data.replace("paid_transfer:", "");
        await handlePaidCallback(callbackQueryId, chatId, messageId, orderNumber, "TRANSFER");
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("paid_pos:")) {
        const orderNumber = data.replace("paid_pos:", "");
        await handlePaidCallback(callbackQueryId, chatId, messageId, orderNumber, "POS");
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("noop:")) {
        await answerCallbackQuery(callbackQueryId, "Already processed");
        return NextResponse.json({ ok: true });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("WEBHOOK ERROR:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
