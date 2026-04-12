import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const menuItems = await prisma.menuItem.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      sortOrder: "asc"
    },
    include: {
      menuModifierGroups: {
        include: {
          modifierGroup: {
            include: {
              options: {
                where: {
                  isActive: true
                },
                orderBy: {
                  sortOrder: "asc"
                }
              }
            }
          }
        }
      }
    }
  });

  return NextResponse.json({
    ok: true,
    count: menuItems.length,
    menuItems
  });
}
