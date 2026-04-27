import { verifySameOrigin } from "@/lib/security/csrf";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = await verifySameOrigin(req);
  if (csrfError) return csrfError;

  const adminError = await requireAdmin();
  if (adminError) return adminError;

  const { id } = await params;

  await prisma.staffInvite.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  revalidatePath("/admin/invites");
  redirect("/admin/invites");
}
