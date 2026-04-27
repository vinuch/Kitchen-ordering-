import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  await prisma.staffInvite.updateMany({
    where: {
      token,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  redirect("/tg/order");
}
