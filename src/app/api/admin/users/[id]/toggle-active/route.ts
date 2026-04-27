import { verifySameOrigin } from "@/lib/security/csrf";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = await verifySameOrigin(req);
  if (csrfError) return csrfError;

  const adminError = await requireAdmin();
  if (adminError) return adminError;

  const { id } = await params;

  const user = await prisma.staffUser.findUnique({
    where: { id },
  });

  if (!user) {
    redirect("/admin/users");
  }

  await prisma.staffUser.update({
    where: { id },
    data: { isActive: !user.isActive },
  });

  redirect("/admin/users");
}
