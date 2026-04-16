export type DraftOrderSelectionInput = {
  modifierOptionId: string;
  quantity: number;
};

export type DraftOrderLineInput = {
  menuItemId: string;
  quantity: number;
  selections: DraftOrderSelectionInput[];
};

export type ValidatedDraftSelection = {
  modifierGroupId: string;
  modifierGroupName: string;
  modifierOptionId: string;
  modifierOptionName: string;
  priceDelta: number;
  quantity: number;
};

export type ValidatedDraftOrderLine = {
  menuItemId: string;
  menuItemName: string;
  basePrice: number;
  quantity: number;
  selections: ValidatedDraftSelection[];
  unitTotal: number;
  lineTotal: number;
};

export type PriceDraftOrderResult = {
  line: ValidatedDraftOrderLine;
  subtotal: number;
  total: number;
};
