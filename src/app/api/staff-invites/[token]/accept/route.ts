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

  try {
    const pinHash = await bcrypt.hash(pin, 10);

    const staff = await prisma.$transaction(async (tx) => {
      const invite = await tx.staffInvite.findUnique({
        where: { token },
      });

      if (
        !invite ||
        invite.usedAt ||
        invite.revokedAt ||
        (invite.expiresAt && invite.expiresAt < new Date())
      ) {
        return null;
      }

      const existingStaff = await tx.staffUser.findFirst({
        where: {
          firstName: {
            equals: name,
            mode: "insensitive",
          },
        },
      });

      if (existingStaff) {
        throw new Error("DUPLICATE_STAFF_NAME");
      }

      const staffCount = await tx.staffUser.count();
      const staffCode = `S${String(staffCount + 1).padStart(3, "0")}`;

      const created = await tx.staffUser.create({
        data: {
          telegramUserId: `web:${token}`,
          staffCode,
          firstName: name,
          lastName: null,
          username: null,
          pinHash,
          isActive: true,
        },
      });

      await tx.staffInvite.update({
        where: { token },
        data: {
          usedAt: new Date(),
          usedByStaffUserId: created.id,
        },
      });

      return created;
    });

    if (!staff) {
      redirect("/join/invalid");
    }

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
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    redirect("/my-orders");
  } catch (error) {
    if (error instanceof Error && error.message === "DUPLICATE_STAFF_NAME") {
      redirect(`/join/${token}?error=duplicate`);
    }

    throw error;
  }
}
