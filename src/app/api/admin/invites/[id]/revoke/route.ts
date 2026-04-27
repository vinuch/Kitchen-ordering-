import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  await prisma.invite.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  revalidatePath("/admin/invites");

  return NextResponse.redirect(
    new URL("/admin/invites", req.url)
  );
}
