import { NextResponse } from "next/server";
import { getActiveMenuItems } from "@/server/menu/get-active-menu-items";

export async function GET() {
  try {
    const items = await getActiveMenuItems();

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (error) {
    console.error("GET /api/menu failed", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load menu",
      },
      { status: 500 },
    );
  }
}
