import { verifySameOrigin } from "@/lib/security/csrf";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const baseDate = dateParam ? new Date(dateParam) : new Date();

    if (Number.isNaN(baseDate.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid date" }, { status: 400 });
    }

    const from = startOfDay(baseDate);
    const to = endOfDay(baseDate);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        totalAmount: true,
        createdAt: true,
        tableNumber: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const paidOrders = orders.filter((o) => o.paymentStatus === "PAID");
    const unpaidOrders = orders.filter((o) => o.paymentStatus !== "PAID");
    const paidRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const unpaidRevenue = unpaidOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const byPaymentMethod = {
      CASH: paidOrders
        .filter((o) => o.paymentMethod === "CASH")
        .reduce((sum, o) => sum + o.totalAmount, 0),
      TRANSFER: paidOrders
        .filter((o) => o.paymentMethod === "TRANSFER")
        .reduce((sum, o) => sum + o.totalAmount, 0),
      POS: paidOrders
        .filter((o) => o.paymentMethod === "POS")
        .reduce((sum, o) => sum + o.totalAmount, 0),
      UNKNOWN: paidOrders
        .filter((o) => !o.paymentMethod)
        .reduce((sum, o) => sum + o.totalAmount, 0),
    };

    return NextResponse.json({
      ok: true,
      date: from.toISOString().slice(0, 10),
      summary: {
        totalOrders,
        totalRevenue,
        paidRevenue,
        unpaidRevenue,
        paidCount: paidOrders.length,
        unpaidCount: unpaidOrders.length,
        byPaymentMethod,
      },
      orders,
    });
  } catch (error) {
    console.error("GET /api/orders/daily-summary failed", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load daily summary" },
      { status: 500 }
    );
  }
}
