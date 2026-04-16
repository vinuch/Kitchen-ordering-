export type MenuListItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isActive: boolean;
  sortOrder: number;
};

export type ModifierOption = {
  id: string;
  name: string;
  priceDelta: number;
  isActive: boolean;
  sortOrder: number;
};

export type ModifierGroup = {
  id: string;
  name: string;
  selectionType: "SINGLE" | "MULTIPLE";
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  options: ModifierOption[];
};

export type MenuItemDetail = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isActive: boolean;
  sortOrder: number;
  modifierGroups: ModifierGroup[];
};

export type SelectionState = Record<string, number>;

export type PriceResponse = {
  ok: boolean;
  line?: {
    menuItemId: string;
    menuItemName: string;
    basePrice: number;
    quantity: number;
    selections: {
      modifierGroupId: string;
      modifierGroupName: string;
      modifierOptionId: string;
      modifierOptionName: string;
      priceDelta: number;
      quantity: number;
    }[];
    unitTotal: number;
    lineTotal: number;
  };
  subtotal?: number;
  total?: number;
  error?: string;
};

export type CartLine = {
  id: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  basePrice: number;
  total: number;
  selections: {
    modifierGroupId: string;
    modifierGroupName: string;
    modifierOptionId: string;
    modifierOptionName: string;
    priceDelta: number;
    quantity: number;
  }[];
};

export type CreateOrderResponse = {
  ok: boolean;
  order?: {
    id: string;
    orderNumber: string;
    subtotalAmount: number;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
  };
  error?: string;
};
