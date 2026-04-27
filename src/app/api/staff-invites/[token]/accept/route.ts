import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
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

  if (
    !invite ||
    invite.usedAt ||
    invite.revokedAt ||
    (invite.expiresAt && invite.expiresAt < new Date())
  ) {
    redirect("/join/invalid");
  }

  const existingStaff = await prisma.staffUser.findFirst({
    where: {
      firstName: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (existingStaff) {
    redirect(`/join/${token}?error=duplicate`);
  }

  const staffCount = await prisma.staffUser.count();
  const staffCode = `S${String(staffCount + 1).padStart(3, "0")}`;

  const staff = await prisma.staffUser.create({
    data: {
      telegramUserId: `web:${token}`,
      staffCode,
      firstName: name,
      username: null,
      pinHash: await bcrypt.hash(pin, 10),
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
    httpOnly: true,
    secure: true,
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
