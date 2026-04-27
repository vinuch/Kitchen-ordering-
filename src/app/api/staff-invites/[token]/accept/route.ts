import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const form = await req.formData();

  const name = String(form.get("name") ?? "").trim();
  const pin = String(form.get("pin") ?? "").trim();

  if (!name || pin.length !== 4) {
    redirect(`/join/${token}?error=invalid`);
  }

  const invite = await prisma.staffInvite.findUnique({
    where: { token },
  });

  if (!invite || invite.revokedAt || (invite.expiresAt && invite.expiresAt < new Date())) {
    redirect("/join/invalid");
  }

  const staff = await prisma.staffUser.upsert({
    where: { telegramUserId: `web:${token}` },
    update: {
      firstName: name,
      username: `pin:${pin}`,
      isActive: true,
    },
    create: {
      telegramUserId: `web:${token}`,
      firstName: name,
      username: `pin:${pin}`,
      isActive: true,
    },
  });

  await prisma.staffInvite.update({
    where: { token },
    data: {
      usedAt: new Date(),
      usedByStaffUserId: staff.id,
    },
  });

  const cookieStore = await cookies();

  cookieStore.set("staff_user_id", staff.id, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  cookieStore.set("staff_name", staff.firstName, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/my-orders");
}
