import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.staffInvite.update({
    where: { id },
    data: { usedAt: new Date() },
  });

  redirect("/admin/invites");
}
