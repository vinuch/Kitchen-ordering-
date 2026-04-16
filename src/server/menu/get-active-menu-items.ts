import { prisma } from "@/lib/prisma";

export async function getActiveMenuItems() {
  return prisma.menuItem.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      isActive: true,
      sortOrder: true,
    },
  });
}
