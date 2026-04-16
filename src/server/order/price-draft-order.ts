import { getMenuItemForOrdering } from "@/server/menu/get-menu-item-for-ordering";
import type {
  DraftOrderLineInput,
  PriceDraftOrderResult,
  ValidatedDraftSelection,
} from "@/server/order/types";

function fail(message: string): never {
  throw new Error(message);
}

export async function priceDraftOrder(
  input: DraftOrderLineInput,
): Promise<PriceDraftOrderResult> {
  if (!input.menuItemId) {
    fail("menuItemId is required");
  }

  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    fail("Quantity must be at least 1");
  }

  const menuItem = await getMenuItemForOrdering(input.menuItemId);

  if (!menuItem) {
    fail("Menu item not found");
  }

  const groupMap = new Map(
    menuItem.modifierGroups.map((group) => [group.id, group]),
  );

  const optionMap = new Map<
    string,
    {
      groupId: string;
      groupName: string;
      optionId: string;
      optionName: string;
      priceDelta: number;
    }
  >();

  for (const group of menuItem.modifierGroups) {
    for (const option of group.options) {
      optionMap.set(option.id, {
        groupId: group.id,
        groupName: group.name,
        optionId: option.id,
        optionName: option.name,
        priceDelta: option.priceDelta,
      });
    }
  }

  const validatedSelections: ValidatedDraftSelection[] = [];
  const selectedCountByGroup = new Map<string, number>();

  for (const selection of input.selections) {
    if (!selection.modifierOptionId) {
      fail("modifierOptionId is required");
    }

    if (!Number.isInteger(selection.quantity) || selection.quantity < 0) {
      fail("Selection quantity must be 0 or more");
    }

    if (selection.quantity === 0) {
      continue;
    }

    const option = optionMap.get(selection.modifierOptionId);

    if (!option) {
      fail("One or more selected options are invalid for this menu item");
    }

    validatedSelections.push({
      modifierGroupId: option.groupId,
      modifierGroupName: option.groupName,
      modifierOptionId: option.optionId,
      modifierOptionName: option.optionName,
      priceDelta: option.priceDelta,
      quantity: selection.quantity,
    });

    selectedCountByGroup.set(
      option.groupId,
      (selectedCountByGroup.get(option.groupId) ?? 0) + selection.quantity,
    );
  }

  for (const group of menuItem.modifierGroups) {
    const count = selectedCountByGroup.get(group.id) ?? 0;

    if (count < group.minSelect) {
      fail(`${group.name} requires at least ${group.minSelect} selection(s)`);
    }

    if (count > group.maxSelect) {
      fail(`${group.name} allows at most ${group.maxSelect} selection(s)`);
    }
  }

  const extrasTotal = validatedSelections.reduce((sum, selection) => {
    return sum + selection.priceDelta * selection.quantity;
  }, 0);

  const unitTotal = menuItem.price + extrasTotal;
  const lineTotal = unitTotal * input.quantity;

  return {
    line: {
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      basePrice: menuItem.price,
      quantity: input.quantity,
      selections: validatedSelections,
      unitTotal,
      lineTotal,
    },
    subtotal: lineTotal,
    total: lineTotal,
  };
}
