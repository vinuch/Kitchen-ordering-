import { prisma } from "../src/lib/prisma";

async function main() {
  const users = await prisma.staffUser.findMany();

  let i = 1;

  for (const user of users) {
    if (user.staffCode) continue;

    const code = `S${String(i).padStart(3, "0")}`;

    await prisma.staffUser.update({
      where: { id: user.id },
      data: { staffCode: code },
    });

    console.log(user.firstName, "->", code);
    i++;
  }
}

main().finally(() => prisma.$disconnect());
