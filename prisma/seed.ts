import "dotenv/config";
import { PrismaClient, ModifierSelectionType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.orderItemModifier.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.botSession.deleteMany();
  await prisma.menuItemModifierGroup.deleteMany();
  await prisma.modifierOption.deleteMany();
  await prisma.modifierGroup.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.staffUser.deleteMany();

  const proteinGroup = await prisma.modifierGroup.create({
    data: {
      name: "Protein",
      selectionType: ModifierSelectionType.SINGLE,
      isRequired: true,
      sortOrder: 1,
      options: {
        create: [
          { name: "Chicken", priceDelta: 0, sortOrder: 1 },
          { name: "Beef", priceDelta: 500, sortOrder: 2 },
          { name: "Fish", priceDelta: 700, sortOrder: 3 },
        ],
      },
    },
    include: {
      options: true,
    },
  });

  const extrasGroup = await prisma.modifierGroup.create({
    data: {
      name: "Extras",
      selectionType: ModifierSelectionType.MULTIPLE,
      isRequired: false,
      sortOrder: 2,
      options: {
        create: [
          { name: "Extra Chicken", priceDelta: 1200, sortOrder: 1 },
          { name: "Extra Beef", priceDelta: 1500, sortOrder: 2 },
          { name: "Plantain", priceDelta: 800, sortOrder: 3 },
          { name: "Salad", priceDelta: 600, sortOrder: 4 },
        ],
      },
    },
    include: {
      options: true,
    },
  });

  const spiceGroup = await prisma.modifierGroup.create({
    data: {
      name: "Spice Level",
      selectionType: ModifierSelectionType.SINGLE,
      isRequired: false,
      sortOrder: 3,
      options: {
        create: [
          { name: "Mild", priceDelta: 0, sortOrder: 1 },
          { name: "Medium", priceDelta: 0, sortOrder: 2 },
          { name: "Hot", priceDelta: 0, sortOrder: 3 },
        ],
      },
    },
    include: {
      options: true,
    },
  });

  const jollofRice = await prisma.menuItem.create({
    data: {
      name: "Jollof Rice",
      description: "Smoky jollof rice plate",
      price: 3500,
      sortOrder: 1,
    },
  });

  const friedRice = await prisma.menuItem.create({
    data: {
      name: "Fried Rice",
      description: "Fried rice plate",
      price: 3800,
      sortOrder: 2,
    },
  });

  const shawarma = await prisma.menuItem.create({
    data: {
      name: "Shawarma",
      description: "Wrap with filling and sauce",
      price: 4000,
      sortOrder: 3,
    },
  });

  const chickenAndChips = await prisma.menuItem.create({
    data: {
      name: "Chicken and Chips",
      description: "Chicken served with fries",
      price: 4500,
      sortOrder: 4,
    },
  });

  const coke = await prisma.menuItem.create({
    data: {
      name: "Coke",
      description: "Soft drink",
      price: 800,
      sortOrder: 5,
    },
  });

  const water = await prisma.menuItem.create({
    data: {
      name: "Water",
      description: "Bottle water",
      price: 500,
      sortOrder: 6,
    },
  });

  await prisma.menuItemModifierGroup.createMany({
    data: [
      { menuItemId: jollofRice.id, modifierGroupId: proteinGroup.id },
      { menuItemId: jollofRice.id, modifierGroupId: extrasGroup.id },
      { menuItemId: jollofRice.id, modifierGroupId: spiceGroup.id },

      { menuItemId: friedRice.id, modifierGroupId: proteinGroup.id },
      { menuItemId: friedRice.id, modifierGroupId: extrasGroup.id },

      { menuItemId: shawarma.id, modifierGroupId: extrasGroup.id },
      { menuItemId: shawarma.id, modifierGroupId: spiceGroup.id },

      { menuItemId: chickenAndChips.id, modifierGroupId: extrasGroup.id },
      { menuItemId: chickenAndChips.id, modifierGroupId: spiceGroup.id },
    ],
  });

  const menuCount = await prisma.menuItem.count();
  const groupCount = await prisma.modifierGroup.count();
  const optionCount = await prisma.modifierOption.count();

  console.log("Seed complete");
  console.log({
    menuCount,
    groupCount,
    optionCount,
    proteinGroup: proteinGroup.name,
    extrasGroup: extrasGroup.name,
    spiceGroup: spiceGroup.name,
  });
}

main()
  .catch((error) => {
    console.error("Seed failed");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
