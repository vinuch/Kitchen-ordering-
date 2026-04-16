import { prisma } from "@/lib/prisma";

export async function getMenuItemForOrdering(menuItemId: string) {
  const menuItem = await prisma.menuItem.findFirst({
    where: {
      id: menuItemId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      isActive: true,
      sortOrder: true,
      menuModifierGroups: {
        orderBy: {
          modifierGroup: {
            sortOrder: "asc",
          },
        },
        select: {
          id: true,
          modifierGroup: {
            select: {
              id: true,
              name: true,
              selectionType: true,
              isRequired: true,
              minSelect: true,
              maxSelect: true,
              sortOrder: true,
              options: {
                where: {
                  isActive: true,
                },
                orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
                select: {
                  id: true,
                  name: true,
                  priceDelta: true,
                  isActive: true,
                  sortOrder: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!menuItem) {
    return null;
  }

  return {
    id: menuItem.id,
    name: menuItem.name,
    description: menuItem.description,
    price: menuItem.price,
    isActive: menuItem.isActive,
    sortOrder: menuItem.sortOrder,
    modifierGroups: menuItem.menuModifierGroups.map(
      (link) => link.modifierGroup,
    ),
  };
}
