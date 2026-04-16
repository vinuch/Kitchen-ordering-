import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type DraftOrder = {
  menuItemId: string;
  selectedOptions: Array<{
    modifierGroupId: string;
    modifierGroupName: string;
    modifierOptionId: string;
    modifierOptionName: string;
    priceDelta: number;
  }>;
  currentGroupIndex: number;
};

type ModifierGroupForFlow = {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: Array<{
    id: string;
    name: string;
    priceDelta: number;
  }>;
};

export async function buildMenuKeyboard() {
  const menuItems = await prisma.menuItem.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      sortOrder: "asc",
    },
  });

  const rows = [];
  for (const item of menuItems) {
    rows.push([
      {
        text: `${item.name} - ₦${item.price.toLocaleString()}`,
        callback_data: `MENU_ITEM:${item.id}`,
      },
    ]);
  }

  rows.push([{ text: "❌ Cancel", callback_data: "CANCEL_ORDER" }]);

  return {
    inline_keyboard: rows,
  };
}

export async function getMenuItemWithModifiers(menuItemId: string) {
  return prisma.menuItem.findUnique({
    where: { id: menuItemId },
    include: {
      menuModifierGroups: {
        include: {
          modifierGroup: {
            include: {
              options: {
                where: { isActive: true },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
        orderBy: {
          modifierGroup: {
            sortOrder: "asc",
          },
        },
      },
    },
  });
}

export function getSelectedCountForGroup(
  draft: DraftOrder,
  modifierGroupId: string,
) {
  return draft.selectedOptions.filter(
    (opt) => opt.modifierGroupId === modifierGroupId,
  ).length;
}

export function getSelectedCountForOption(
  draft: DraftOrder,
  modifierGroupId: string,
  modifierOptionId: string,
) {
  return draft.selectedOptions.filter(
    (opt) =>
      opt.modifierGroupId === modifierGroupId &&
      opt.modifierOptionId === modifierOptionId,
  ).length;
}

export function buildModifierPrompt(
  group: ModifierGroupForFlow,
  draft: DraftOrder,
) {
  const selectedCount = getSelectedCountForGroup(draft, group.id);

  let requirementText = "";
  if (group.minSelect === group.maxSelect) {
    requirementText = `Select exactly ${group.maxSelect}`;
  } else if (group.minSelect > 0) {
    requirementText = `Select ${group.minSelect}-${group.maxSelect}`;
  } else {
    requirementText = `Optional, up to ${group.maxSelect}`;
  }

  return `Choose ${group.name}:\nSelected: ${selectedCount}/${group.maxSelect}\n${requirementText}`;
}

export function buildModifierKeyboard(
  group: ModifierGroupForFlow,
  draft: DraftOrder,
) {
  const selectedCount = getSelectedCountForGroup(draft, group.id);

  const rows = group.options.map((opt) => {
    const optionCount = getSelectedCountForOption(draft, group.id, opt.id);

    let text =
      opt.priceDelta > 0
        ? `${opt.name} +₦${opt.priceDelta.toLocaleString()}`
        : opt.name;

    if (optionCount > 0) {
      text += ` ×${optionCount}`;
    }

    return [
      {
        text,
        callback_data: `MOD:${group.id}:${opt.id}`,
      },
    ];
  });

  rows.push([
    {
      text: `✅ Done (${selectedCount}/${group.maxSelect})`,
      callback_data: `DONE_GROUP:${group.id}`,
    },
  ]);

  if (!group.isRequired && selectedCount === 0) {
    rows.push([{ text: "Skip", callback_data: `SKIP_GROUP:${group.id}` }]);
  }

  rows.push([{ text: "⬅️ Back to Menu", callback_data: "BACK_TO_MENU" }]);

  return {
    inline_keyboard: rows,
  };
}

export function buildQuantityKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "1", callback_data: "QTY:1" },
        { text: "2", callback_data: "QTY:2" },
        { text: "3", callback_data: "QTY:3" },
      ],
      [
        { text: "4", callback_data: "QTY:4" },
        { text: "5", callback_data: "QTY:5" },
      ],
      [{ text: "❌ Cancel", callback_data: "CANCEL_ORDER" }],
    ],
  };
}

function toPrismaJson(
  value: Record<string, unknown> | null | undefined
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

export async function upsertBotSession(
  telegramUserId: string,
  data: {
    state?:
      | "IDLE"
      | "SELECTING_ITEMS"
      | "SELECTING_MODIFIERS"
      | "SELECTING_QUANTITY"
      | "REVIEWING_ORDER";
    draftOrderJson?: Record<string, unknown> | null;
  }
) {
  const prismaDraftOrderJson = toPrismaJson(data.draftOrderJson);

  return prisma.botSession.upsert({
    where: { telegramUserId },
    update: {
      ...(data.state ? { state: data.state } : {}),
      ...(prismaDraftOrderJson !== undefined
        ? { draftOrderJson: prismaDraftOrderJson }
        : {}),
    },
    create: {
      telegramUserId,
      state: data.state ?? "IDLE",
      ...(prismaDraftOrderJson !== undefined
        ? { draftOrderJson: prismaDraftOrderJson }
        : {}),
    },
  });
}

export async function getBotSession(telegramUserId: string) {
  return prisma.botSession.findUnique({
    where: { telegramUserId },
  });
}

export async function clearBotSession(telegramUserId: string) {
  return upsertBotSession(telegramUserId, {
    state: "IDLE",
    draftOrderJson: null,
  });
}

export function createDraftOrder(menuItemId: string): DraftOrder {
  return {
    menuItemId,
    selectedOptions: [],
    currentGroupIndex: 0,
  };
}

export function getDraftOrder(
  session: { draftOrderJson: unknown } | null,
): DraftOrder | null {
  if (!session?.draftOrderJson) return null;
  return session.draftOrderJson as DraftOrder;
}

export function addSelectedOption(
  draft: DraftOrder,
  payload: {
    modifierGroupId: string;
    modifierGroupName: string;
    modifierOptionId: string;
    modifierOptionName: string;
    priceDelta: number;
  },
): DraftOrder {
  return {
    ...draft,
    selectedOptions: [...draft.selectedOptions, payload],
  };
}

export function skipCurrentGroup(draft: DraftOrder): DraftOrder {
  return {
    ...draft,
    currentGroupIndex: draft.currentGroupIndex + 1,
  };
}

export function getCurrentModifierGroup(
  item: Awaited<ReturnType<typeof getMenuItemWithModifiers>>,
  draft: DraftOrder,
) {
  if (!item) return null;
  return (
    item.menuModifierGroups[draft.currentGroupIndex]?.modifierGroup ?? null
  );
}

export function calculateTotal(
  basePrice: number,
  selectedOptions: DraftOrder["selectedOptions"],
  quantity: number,
) {
  const extrasTotal = selectedOptions.reduce(
    (sum, opt) => sum + opt.priceDelta,
    0,
  );

  const unitTotal = basePrice + extrasTotal;
  const total = unitTotal * quantity;

  return {
    unitTotal,
    total,
  };
}

export function buildReviewMessage(
  item: { name: string; price: number },
  draft: DraftOrder,
  quantity: number,
) {
  let text = `🧾 <b>Order Summary</b>\n\n`;
  text += `${item.name}\n`;

  for (const opt of draft.selectedOptions) {
    text += `- ${opt.modifierGroupName}: ${opt.modifierOptionName}\n`;
  }

  text += `\nQty: ${quantity}\n`;

  const { total } = calculateTotal(item.price, draft.selectedOptions, quantity);

  text += `\nTotal: ₦${total.toLocaleString()}`;

  return text;
}

export function buildReviewKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "✅ Submit Order", callback_data: "SUBMIT_ORDER" }],
      [{ text: "❌ Cancel", callback_data: "CANCEL_ORDER" }],
    ],
  };
}
