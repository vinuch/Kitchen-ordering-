import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.staffInvite.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  revalidatePath("/admin/invites");
  redirect("/admin/invites");
}
