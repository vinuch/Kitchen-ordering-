import { NextResponse } from "next/server";
import { sendMessage } from "@/lib/telegram";
import { prisma } from "@/lib/prisma";
import {
  addSelectedOption,
  buildMenuKeyboard,
  buildModifierKeyboard,
  buildModifierPrompt,
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
  getSelectedCountForGroup,
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
    console.log("OPERATOR_CHAT_ID:", message.chat.id);
    const text = message.text;

    if (text === "/start") {
      await sendMessage(chatId, "Welcome to Kitchen Bot 👨‍🍳", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📝 New Order",
                web_app: {
                  url: `${process.env.NEXT_PUBLIC_APP_URL}/tg/order?v=3`,
                },
              },
            ],
            [
              {
                text: "↩️ Fallback Inline Order",
                callback_data: "NEW_ORDER",
              },
            ],
          ],
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

      await sendMessage(chatId, buildModifierPrompt(firstGroup, draft), {
        reply_markup: buildModifierKeyboard(firstGroup, draft),
      });

      return NextResponse.json({ ok: true });
    }

    if (data.startsWith("MOD:")) {
      const [, modifierGroupId, modifierOptionId] = data.split(":");

      const session = await getBotSession(telegramUserId);
      const draft = getDraftOrder(session);

      if (!draft) {
        await sendMessage(
          chatId,
          "No active order. Tap New Order to start again.",
        );
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
        await sendMessage(
          chatId,
          "That option is no longer valid. Start again.",
        );
        await clearBotSession(telegramUserId);
        return NextResponse.json({ ok: true });
      }

      const currentSelectedCount = getSelectedCountForGroup(
        draft,
        currentGroup.id,
      );

      if (currentSelectedCount >= currentGroup.maxSelect) {
        await sendMessage(
          chatId,
          `You've already selected the maximum for ${currentGroup.name}. Tap Done to continue.`,
          {
            reply_markup: buildModifierKeyboard(currentGroup, draft),
          },
        );
        return NextResponse.json({ ok: true });
      }

      const selectedOption = currentGroup.options.find(
        (opt) => opt.id === modifierOptionId,
      );

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

      const nextSelectedCount = getSelectedCountForGroup(
        nextDraft,
        currentGroup.id,
      );

      if (nextSelectedCount >= currentGroup.maxSelect) {
        const advancedDraft = skipCurrentGroup(nextDraft);
        const nextGroup = getCurrentModifierGroup(item, advancedDraft);

        if (!nextGroup) {
          await upsertBotSession(telegramUserId, {
            state: "SELECTING_QUANTITY",
            draftOrderJson: advancedDraft,
          });

          await sendMessage(chatId, "Choose quantity:", {
            reply_markup: buildQuantityKeyboard(),
          });

          return NextResponse.json({ ok: true });
        }

        await upsertBotSession(telegramUserId, {
          state: "SELECTING_MODIFIERS",
          draftOrderJson: advancedDraft,
        });

        await sendMessage(
          chatId,
          buildModifierPrompt(nextGroup, advancedDraft),
          {
            reply_markup: buildModifierKeyboard(nextGroup, advancedDraft),
          },
        );

        return NextResponse.json({ ok: true });
      }

      await upsertBotSession(telegramUserId, {
        state: "SELECTING_MODIFIERS",
        draftOrderJson: nextDraft,
      });

      await sendMessage(chatId, buildModifierPrompt(currentGroup, nextDraft), {
        reply_markup: buildModifierKeyboard(currentGroup, nextDraft),
      });

      return NextResponse.json({ ok: true });
    }

    if (data.startsWith("DONE_GROUP:")) {
      const [, modifierGroupId] = data.split(":");

      const session = await getBotSession(telegramUserId);
      const draft = getDraftOrder(session);

      if (!draft) {
        await sendMessage(
          chatId,
          "No active order. Tap New Order to start again.",
        );
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
        await sendMessage(
          chatId,
          "That group is no longer valid. Start again.",
        );
        await clearBotSession(telegramUserId);
        return NextResponse.json({ ok: true });
      }

      const selectedCount = getSelectedCountForGroup(draft, currentGroup.id);

      if (selectedCount < currentGroup.minSelect) {
        await sendMessage(
          chatId,
          `Select at least ${currentGroup.minSelect} option(s) for ${currentGroup.name}.`,
          {
            reply_markup: buildModifierKeyboard(currentGroup, draft),
          },
        );
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

      await sendMessage(chatId, buildModifierPrompt(nextGroup, nextDraft), {
        reply_markup: buildModifierKeyboard(nextGroup, nextDraft),
      });

      return NextResponse.json({ ok: true });
    }

    if (data.startsWith("SKIP_GROUP:")) {
      const [, modifierGroupId] = data.split(":");

      const session = await getBotSession(telegramUserId);
      const draft = getDraftOrder(session);

      if (!draft) {
        await sendMessage(
          chatId,
          "No active order. Tap New Order to start again.",
        );
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
        await sendMessage(
          chatId,
          "That group is no longer valid. Start again.",
        );
        await clearBotSession(telegramUserId);
        return NextResponse.json({ ok: true });
      }

      const selectedCount = getSelectedCountForGroup(draft, currentGroup.id);

      if (selectedCount < currentGroup.minSelect) {
        await sendMessage(
          chatId,
          `Select at least ${currentGroup.minSelect} option(s) for ${currentGroup.name}.`,
          {
            reply_markup: buildModifierKeyboard(currentGroup, draft),
          },
        );
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

      await sendMessage(chatId, buildModifierPrompt(nextGroup, nextDraft), {
        reply_markup: buildModifierKeyboard(nextGroup, nextDraft),
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
        const staffUser = await prisma.staffUser.findUnique({
          where: { telegramUserId },
        });

        if (staffUser) {
          const recentOrder = await prisma.order.findFirst({
            where: {
              staffUserId: staffUser.id,
              createdAt: {
                gte: new Date(Date.now() - 2 * 60 * 1000),
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          });

          if (recentOrder) {
            await sendMessage(
              chatId,
              `✅ Order already submitted.\nOrder #: ${recentOrder.orderNumber}\nTotal: ₦${recentOrder.totalAmount.toLocaleString()}`,
            );
            return NextResponse.json({ ok: true });
          }
        }

        await sendMessage(
          chatId,
          "No active order draft. Tap New Order to start again.",
        );
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
        draft.quantity,
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
                  create: (() => {
                    const grouped: Record<string, any> = {};

                    for (const opt of draft.selectedOptions) {
                      const key = `${opt.modifierGroupName}::${opt.modifierOptionName}`;

                      if (!grouped[key]) {
                        grouped[key] = {
                          modifierGroupNameSnapshot: opt.modifierGroupName,
                          modifierOptionNameSnapshot: opt.modifierOptionName,
                          priceDeltaSnapshot: opt.priceDelta,
                          modifierOptionId: opt.modifierOptionId ?? null,
                          quantity: 0,
                        };
                      }

                      grouped[key].quantity += 1;
                    }

                    return Object.values(grouped);
                  })(),
                },
              },
            ],
          },
        },
      });

      await clearBotSession(telegramUserId);

      await sendMessage(
        chatId,
        `✅ Order submitted!\nOrder #: ${order.orderNumber}\nTotal: ₦${total.toLocaleString()}`,
      );

      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ ok: true });
}
