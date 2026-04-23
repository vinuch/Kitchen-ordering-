import "dotenv/config";
import { PrismaClient, ModifierSelectionType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

type MenuItemInput = {
  name: string;
  description?: string;
  price: number;
  sortOrder: number;
  isActive?: boolean;
};

type ModifierGroupInput = {
  name: string;
  selectionType: ModifierSelectionType;
  isRequired: boolean;
  minSelect?: number;
  maxSelect?: number;
  sortOrder: number;
  options: Array<{
    name: string;
    priceDelta: number;
    sortOrder: number;
    isActive?: boolean;
  }>;
};

const menuItems: MenuItemInput[] = [
  { name: "Jollof Rice", description: "Rice plate", price: 3000, sortOrder: 1, isActive: true },
  { name: "Rice & Stew", description: "Rice served with stew", price: 3000, sortOrder: 2, isActive: true },
  { name: "Rice & Ofe Akwu", description: "Rice served with ofe akwu", price: 3000, sortOrder: 3, isActive: true },

  { name: "Egusi", description: "Egusi soup", price: 3000, sortOrder: 10, isActive: true },
  { name: "Okra", description: "Okra soup", price: 3000, sortOrder: 11, isActive: true },
  { name: "Bitterleaf", description: "Bitterleaf soup", price: 3000, sortOrder: 12, isActive: true },

  { name: "Fanta", description: "Soft drink", price: 500, sortOrder: 20, isActive: true },
  { name: "Coke", description: "Soft drink", price: 500, sortOrder: 21, isActive: true },
  { name: "Heineken", description: "Beer", price: 1800, sortOrder: 22, isActive: true },
  { name: "Malt", description: "Malt drink", price: 800, sortOrder: 23, isActive: true },
  { name: "Water", description: "Bottle water", price: 200, sortOrder: 24, isActive: true },

  { name: "Small Stout", description: "Price pending", price: 0, sortOrder: 30, isActive: false },
  { name: "Goldberg", description: "Price pending", price: 0, sortOrder: 31, isActive: false },
  { name: "Goldberg Black", description: "Price pending", price: 0, sortOrder: 32, isActive: false },
  { name: "Smirnoff", description: "Price pending", price: 0, sortOrder: 33, isActive: false },
  { name: "Pulpy Orange", description: "Price pending", price: 0, sortOrder: 34, isActive: false },
  { name: "Chivita", description: "Price pending", price: 0, sortOrder: 35, isActive: false },
  { name: "Flying Fish", description: "Price pending", price: 0, sortOrder: 36, isActive: false },
];

const modifierGroups: ModifierGroupInput[] = [
  {
    name: "Protein",
    selectionType: ModifierSelectionType.SINGLE,
    isRequired: true,
    minSelect: 1,
    maxSelect: 1,
    sortOrder: 1,
    options: [
      { name: "Assorted (Shaki & Round About)", priceDelta: 1000, sortOrder: 1, isActive: true },
      { name: "Goat Meat", priceDelta: 1500, sortOrder: 2, isActive: true },
      { name: "Dry Fish", priceDelta: 2000, sortOrder: 3, isActive: true },
    ],
  },
  {
    name: "Extra Swallow",
    selectionType: ModifierSelectionType.MULTIPLE,
    isRequired: false,
    minSelect: 0,
    maxSelect: 3,
    sortOrder: 2,
    options: [
      { name: "Garri", priceDelta: 300, sortOrder: 1, isActive: true },
      { name: "Semo", priceDelta: 300, sortOrder: 2, isActive: true },
      { name: "Fufu", priceDelta: 300, sortOrder: 3, isActive: true },
    ],
  },
];

const proteinItems = [
  "Jollof Rice",
  "Rice & Stew",
  "Rice & Ofe Akwu",
  "Egusi",
  "Okra",
  "Bitterleaf",
];

const extraSwallowItems = [
  "Egusi",
  "Okra",
  "Bitterleaf",
];

async function upsertModifierGroup(group: ModifierGroupInput) {
  const existing = await prisma.modifierGroup.findFirst({
    where: { name: group.name },
  });

  const modifierGroup = existing
    ? await prisma.modifierGroup.update({
        where: { id: existing.id },
        data: {
          name: group.name,
          selectionType: group.selectionType,
          isRequired: group.isRequired,
          minSelect: group.minSelect ?? 0,
          maxSelect: group.maxSelect ?? 1,
          sortOrder: group.sortOrder,
        },
      })
    : await prisma.modifierGroup.create({
        data: {
          name: group.name,
          selectionType: group.selectionType,
          isRequired: group.isRequired,
          minSelect: group.minSelect ?? 0,
          maxSelect: group.maxSelect ?? 1,
          sortOrder: group.sortOrder,
        },
      });

  for (const option of group.options) {
    const existingOption = await prisma.modifierOption.findFirst({
      where: {
        modifierGroupId: modifierGroup.id,
        name: option.name,
      },
    });

    if (existingOption) {
      await prisma.modifierOption.update({
        where: { id: existingOption.id },
        data: {
          name: option.name,
          priceDelta: option.priceDelta,
          sortOrder: option.sortOrder,
          isActive: option.isActive ?? true,
        },
      });
    } else {
      await prisma.modifierOption.create({
        data: {
          modifierGroupId: modifierGroup.id,
          name: option.name,
          priceDelta: option.priceDelta,
          sortOrder: option.sortOrder,
          isActive: option.isActive ?? true,
        },
      });
    }
  }

  return modifierGroup;
}

async function upsertMenuItem(item: MenuItemInput) {
  const existing = await prisma.menuItem.findFirst({
    where: { name: item.name },
  });

  if (existing) {
    return prisma.menuItem.update({
      where: { id: existing.id },
      data: {
        name: item.name,
        description: item.description,
        price: item.price,
        sortOrder: item.sortOrder,
        isActive: item.isActive ?? true,
      },
    });
  }

  return prisma.menuItem.create({
    data: {
      name: item.name,
      description: item.description,
      price: item.price,
      sortOrder: item.sortOrder,
      isActive: item.isActive ?? true,
    },
  });
}

async function ensureMenuItemHasGroup(menuItemId: string, modifierGroupId: string) {
  const existing = await prisma.menuItemModifierGroup.findFirst({
    where: {
      menuItemId,
      modifierGroupId,
    },
  });

  if (!existing) {
    await prisma.menuItemModifierGroup.create({
      data: {
        menuItemId,
        modifierGroupId,
      },
    });
  }
}

async function main() {
  const desiredMenuNames = new Set(menuItems.map((item) => item.name));

  await prisma.menuItem.updateMany({
    where: {
      name: {
        notIn: [...desiredMenuNames],
      },
    },
    data: {
      isActive: false,
    },
  });

  const proteinGroup = await upsertModifierGroup(
    modifierGroups.find((g) => g.name === "Protein")!,
  );

  const extraSwallowGroup = await upsertModifierGroup(
    modifierGroups.find((g) => g.name === "Extra Swallow")!,
  );

  const syncedItems = new Map<string, { id: string; name: string }>();

  for (const item of menuItems) {
    const synced = await upsertMenuItem(item);
    syncedItems.set(synced.name, { id: synced.id, name: synced.name });
  }

  for (const itemName of proteinItems) {
    const item = syncedItems.get(itemName);
    if (item) {
      await ensureMenuItemHasGroup(item.id, proteinGroup.id);
    }
  }

  for (const itemName of extraSwallowItems) {
    const item = syncedItems.get(itemName);
    if (item) {
      await ensureMenuItemHasGroup(item.id, extraSwallowGroup.id);
    }
  }

  console.log("✅ Menu sync complete");
  console.log("Items synced:", menuItems.length);
  console.log("Modifier groups synced:", modifierGroups.length);
}

main()
  .catch((error) => {
    console.error("❌ sync-menu failed");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
