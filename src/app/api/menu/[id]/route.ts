import { NextResponse } from "next/server";
import { getMenuItemForOrdering } from "@/server/menu/get-menu-item-for-ordering";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const item = await getMenuItemForOrdering(id);

    if (!item) {
      return NextResponse.json(
        {
          ok: false,
          error: "Menu item not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      item,
    });
  } catch (error) {
    console.error("GET /api/menu/[id] failed", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load menu item",
      },
      { status: 500 },
    );
  }
}
