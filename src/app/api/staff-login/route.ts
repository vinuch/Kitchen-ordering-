import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const form = await req.formData();

  const staffCode = String(form.get("staffCode") ?? "").trim();
  const pin = String(form.get("pin") ?? "").trim();

  const staff = await prisma.staffUser.findUnique({
    where: { staffCode },
  });

  if (!staff || !staff.isActive || !staff.pinHash) {
    redirect("/login?error=invalid");
  }

  const valid = await bcrypt.compare(pin, staff.pinHash);

  if (!valid) {
    redirect("/login?error=invalid");
  }

  const cookieStore = await cookies();

  cookieStore.set("staff_user_id", staff.id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/my-orders");
}
