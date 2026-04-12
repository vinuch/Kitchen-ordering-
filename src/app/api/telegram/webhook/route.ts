import { NextResponse } from "next/server";
import { sendMessage } from "@/lib/telegram";
import { prisma } from "@/lib/prisma";
import {
  addSelectedOption,
  buildMenuKeyboard,
  buildModifierKeyboard,
  buildQuantityKeyboard,
  buildReviewKeyboard,
  buildReviewMessage,
  calculateTotal,
  clearBotSession,
  createDraftOrder,
  getBotSession,
  getCurrentModifierGroup,
  getDraftOrder,
  getMenuItemWithModifiers,
  skipCurrentGroup,
  upsertBotSession,
} from "@/lib/order-flow";

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "telegram-webhook",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  console.log("TELEGRAM_UPDATE", JSON.stringify(body, null, 2));

  const message = body.message;
  const callbackQuery = body.callback_query;

  if (message) {
    const chatId = message.chat.id;
    const text = message.text;

    if (text === "/start") {
      await sendMessage(chatId, "Welcome to Kitchen Bot 👨‍🍳", {
        reply_markup: {
          inline_keyboard: [[{ text: "📝 New Order", callback_data: "NEW_ORDER" }]],
        },
      });
    }

    return NextResponse.json({ ok: true });
  }

  if (callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data as string;
    const telegramUserId = String(callbackQuery.from.id);

    if (data === "NEW_ORDER") {
      await clearBotSession(telegramUserId);

      const keyboard = await buildMenuKeyboard();

      await upsertBotSession(telegramUserId, {
        state: "SELECTING_ITEMS",
      });

      await sendMessage(chatId, "Select an item to add:", {
        reply_markup: keyboard,
      });

      return NextResponse.json({ ok: true });
    }

    if (data === "BACK_TO_MENU") {
      const keyboard = await buildMenuKeyboard();

      await upsertBotSession(telegramUserId, {
        state: "SELECTING_ITEMS",
        draftOrderJson: null,
      });

      await sendMessage(chatId, "Select an item to add:", {
        reply_markup: keyboard,
      });

      return NextResponse.json({ ok: true });
    }

    if (data === "CANCEL_ORDER") {
      await clearBotSession(telegramUserId);
      await sendMessage(chatId, "Order cancelled.");

      return NextResponse.json({ ok: true });
    }

    if (data.startsWith("MENU_ITEM:")) {
      const menuItemId = data.split(":")[1];
      const item = await getMenuItemWithModifiers(menuItemId);

      if (!item) {
        await sendMessage(chatId, "Item not found.");
        return NextResponse.json({ ok: true });
      }

      const draft = createDraftOrder(menuItemId);

      await upsertBotSession(telegramUserId, {
        state: "SELECTING_MODIFIERS",
        draftOrderJson: draft,
      });

      const firstGroup = getCurrentModifierGroup(item, draft);

      if (!firstGroup) {
        await upsertBotSession(telegramUserId, {
          state: "SELECTING_QUANTITY",
          draftOrderJson: draft,
        });

        await sendMessage(chatId, `Selected ${item.name}. Choose quantity:`, {
          reply_markup: buildQuantityKeyboard(),
        });

        return NextResponse.json({ ok: true });
      }

      await sendMessage(chatId, `Choose ${firstGroup.name}:`, {
        reply_markup: buildModifierKeyboard(firstGroup, firstGroup.isRequired),
      });

      return NextResponse.json({ ok: true });
    }

    if (data.startsWith("MOD:")) {
      const [, modifierGroupId, modifierOptionId] = data.split(":");

      const session = await getBotSession(telegramUserId);
      const draft = getDraftOrder(session);

      if (!draft) {
        await sendMessage(chatId, "No active order. Tap New Order to start again.");
        return NextResponse.json({ ok: true });
      }

      const item = await getMenuItemWithModifiers(draft.menuItemId);

      if (!item) {
        await sendMessage(chatId, "Selected menu item no longer exists.");
        await clearBotSession(telegramUserId);
        return NextResponse.json({ ok: true });
      }

      const currentGroup = getCurrentModifierGroup(item, draft);

      if (!currentGroup || currentGroup.id !== modifierGroupId) {
        await sendMessage(chatId, "That option is no longer valid. Start again.");
        await clearBotSession(telegramUserId);
        return NextResponse.json({ ok: true });
      }

      const selectedOption = currentGroup.options.find((opt) => opt.id === modifierOptionId);

      if (!selectedOption) {
        await sendMessage(chatId, "Option not found.");
        return NextResponse.json({ ok: true });
      }

      const nextDraft = addSelectedOption(draft, {
        modifierGroupId: currentGroup.id,
        modifierGroupName: currentGroup.name,
        modifierOptionId: selectedOption.id,
        modifierOptionName: selectedOption.name,
        priceDelta: selectedOption.priceDelta,
      });

      const nextGroup = getCurrentModifierGroup(item, nextDraft);

      if (!nextGroup) {
        await upsertBotSession(telegramUserId, {
          state: "SELECTING_QUANTITY",
          draftOrderJson: nextDraft,
        });

        await sendMessage(chatId, "Choose quantity:", {
          reply_markup: buildQuantityKeyboard(),
        });

        return NextResponse.json({ ok: true });
      }

      await upsertBotSession(telegramUserId, {
        state: "SELECTING_MODIFIERS",
        draftOrderJson: nextDraft,
      });

      await sendMessage(chatId, `Choose ${nextGroup.name}:`, {
        reply_markup: buildModifierKeyboard(nextGroup, nextGroup.isRequired),
      });

      return NextResponse.json({ ok: true });
    }

    if (data.startsWith("SKIP_GROUP:")) {
      const session = await getBotSession(telegramUserId);
      const draft = getDraftOrder(session);

      if (!draft) {
        await sendMessage(chatId, "No active order. Tap New Order to start again.");
        return NextResponse.json({ ok: true });
      }

      const item = await getMenuItemWithModifiers(draft.menuItemId);

      if (!item) {
        await sendMessage(chatId, "Selected menu item no longer exists.");
        await clearBotSession(telegramUserId);
        return NextResponse.json({ ok: true });
      }

      const nextDraft = skipCurrentGroup(draft);
      const nextGroup = getCurrentModifierGroup(item, nextDraft);

      if (!nextGroup) {
        await upsertBotSession(telegramUserId, {
          state: "SELECTING_QUANTITY",
          draftOrderJson: nextDraft,
        });

        await sendMessage(chatId, "Choose quantity:", {
          reply_markup: buildQuantityKeyboard(),
        });

        return NextResponse.json({ ok: true });
      }

      await upsertBotSession(telegramUserId, {
        state: "SELECTING_MODIFIERS",
        draftOrderJson: nextDraft,
      });

      await sendMessage(chatId, `Choose ${nextGroup.name}:`, {
        reply_markup: buildModifierKeyboard(nextGroup, nextGroup.isRequired),
      });

      return NextResponse.json({ ok: true });
    }

    if (data.startsWith("QTY:")) {
      const qty = Number(data.split(":")[1]);

      const session = await getBotSession(telegramUserId);
      const draft = getDraftOrder(session);

      if (!draft) {
        await sendMessage(chatId, "No active order.");
        return NextResponse.json({ ok: true });
      }

      const item = await getMenuItemWithModifiers(draft.menuItemId);

      if (!item) {
        await sendMessage(chatId, "Item not found.");
        return NextResponse.json({ ok: true });
      }

      const message = buildReviewMessage(item, draft, qty);

      await upsertBotSession(telegramUserId, {
        state: "REVIEWING_ORDER",
        draftOrderJson: {
          ...draft,
          quantity: qty,
        },
      });

      await sendMessage(chatId, message, {
        reply_markup: buildReviewKeyboard(),
      });

      return NextResponse.json({ ok: true });
    }

    if (data === "SUBMIT_ORDER") {
      const session = await getBotSession(telegramUserId);
      const draft = getDraftOrder(session) as any;

      if (!draft || !draft.quantity) {
        await sendMessage(chatId, "Invalid order.");
        return NextResponse.json({ ok: true });
      }

      const item = await getMenuItemWithModifiers(draft.menuItemId);

      if (!item) {
        await sendMessage(chatId, "Item not found.");
        return NextResponse.json({ ok: true });
      }

      const staffUser = await prisma.staffUser.upsert({
        where: { telegramUserId },
        update: {
          firstName: callbackQuery.from.first_name ?? "Staff",
          lastName: callbackQuery.from.last_name ?? null,
          username: callbackQuery.from.username ?? null,
          isActive: true,
        },
        create: {
          telegramUserId,
          firstName: callbackQuery.from.first_name ?? "Staff",
          lastName: callbackQuery.from.last_name ?? null,
          username: callbackQuery.from.username ?? null,
          isActive: true,
        },
      });

      const basePrice = item.price;

      const { total } = calculateTotal(
        basePrice,
        draft.selectedOptions,
        draft.quantity
      );

      const order = await prisma.order.create({
        data: {
          orderNumber: `ORD-${Date.now()}`,
          staffUserId: staffUser.id,
          subtotalAmount: total,
          totalAmount: total,
          status: "PENDING",
          paymentStatus: "UNPAID",
          items: {
            create: [
              {
                menuItemId: item.id,
                menuItemNameSnapshot: item.name,
                unitPriceSnapshot: basePrice,
                quantity: draft.quantity,
                lineTotal: total,
                modifiers: {
                  create: draft.selectedOptions.map((opt: any) => ({
                    modifierGroupNameSnapshot: opt.modifierGroupName,
                    modifierOptionNameSnapshot: opt.modifierOptionName,
                    priceDeltaSnapshot: opt.priceDelta,
                  })),
                },
              },
            ],
          },
        },
      });

      await clearBotSession(telegramUserId);

      await sendMessage(
        chatId,
        `✅ Order submitted!\nOrder #: ${order.orderNumber}\nTotal: ₦${total.toLocaleString()}`
      );

      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ ok: true });
}
