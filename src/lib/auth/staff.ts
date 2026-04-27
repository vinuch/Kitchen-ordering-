import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function requireActiveStaff() {
  const cookieStore = await cookies();
  const staffUserId = cookieStore.get("staff_user_id")?.value;

  if (!staffUserId) {
    redirect("/login");
  }

  const staff = await prisma.staffUser.findUnique({
    where: { id: staffUserId },
  });

  if (!staff || !staff.isActive) {
    cookieStore.delete("staff_user_id");
    cookieStore.delete("staff_name");
    redirect("/login?error=inactive");
  }

  return staff;
}
