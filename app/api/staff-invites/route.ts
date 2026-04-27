import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const token = crypto.randomBytes(24).toString("hex");

  const invite = await prisma.staffInvite.create({
    data: {
      token,
      role: body.role ?? "SERVER",
      name: body.name ?? null,
    },
  });

  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  return NextResponse.json({
    invite,
    url: `${baseUrl}/join/${token}`,
  });
}
