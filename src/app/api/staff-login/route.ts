import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function POST(req: Request) {
  const form = await req.formData();

  const name = String(form.get("name") ?? "").trim();
  const pin = String(form.get("pin") ?? "").trim();

  const staff = await prisma.staffUser.findFirst({
    where: {
      firstName: name,
      username: `pin:${pin}`,
      isActive: true,
    },
  });

  if (!staff || !staff.isActive) {
    redirect("/login?error=invalid");
  }

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
