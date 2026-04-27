import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cookieStore = await cookies();
  const staffUserId = cookieStore.get("staff_user_id")?.value;

  if (!staffUserId) {
    return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: { staffUserId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      items: {
        include: {
          modifiers: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, orders });
}
