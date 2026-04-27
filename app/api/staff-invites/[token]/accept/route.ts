import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invite = await prisma.staffInvite.findUnique({
    where: { token },
  });

  if (!invite || invite.usedAt) {
    redirect("/join/error");
  }

  await prisma.staffInvite.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  redirect("/orders/new");
}
