import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const users = await prisma.staffUser.findMany({
    where: {
      pinHash: null,
      username: {
        startsWith: "pin:",
      },
    },
  });

  for (const user of users) {
    const pin = user.username?.replace("pin:", "") ?? "";
    if (!pin) continue;

    const hash = await bcrypt.hash(pin, 10);

    await prisma.staffUser.update({
      where: { id: user.id },
      data: { pinHash: hash },
    });

    console.log(`hashed ${user.firstName}`);
  }

  console.log("done");
}

main().finally(async () => {
  await prisma.$disconnect();
});
