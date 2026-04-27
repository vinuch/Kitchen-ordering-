import { prisma } from "../src/lib/prisma";
import fs from "fs";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";


type HistoricalDay = {
  date: string;
  orders: { item: string; amount: number }[];
};

function orderNumber(date: string, index: number) {
  return `HIST-${date.replaceAll("-", "")}-${String(index + 1).padStart(3, "0")}`;
}

async function main() {
  const rl = readline.createInterface({ input, output });

  const users = await prisma.staffUser.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, firstName: true, telegramUserId: true, isActive: true },
  });

  console.log("\nChoose staff user:\n");
  users.forEach((u, i) => {
    console.log(`${i + 1}. ${u.firstName} (${u.isActive ? "active" : "inactive"}) — ${u.id}`);
  });

  const choice = Number(await rl.question("\nStaff number: "));
  const staff = users[choice - 1];

  if (!staff) throw new Error("Invalid staff choice");

  const raw = fs.readFileSync("data/historical-orders.json", "utf8");
  const days = JSON.parse(raw) as HistoricalDay[];

  let manualItem = await prisma.menuItem.findFirst({
    where: { name: "Manual Ledger Entry" },
  });

  if (!manualItem) {
    manualItem = await prisma.menuItem.create({
      data: {
        name: "Manual Ledger Entry",
        description: "Imported handwritten historical order",
        price: 0,
        isActive: false,
        sortOrder: 9999,
      },
    });
  }

  let count = 0;

  for (const day of days) {
    for (let i = 0; i < day.orders.length; i++) {
      const entry = day.orders[i];
      const num = orderNumber(day.date, i);

      const exists = await prisma.order.findUnique({
        where: { orderNumber: num },
      });

      if (exists) {
        console.log(`skip existing ${num}`);
        continue;
      }

      await prisma.order.create({
        data: {
          orderNumber: num,
          staffUserId: staff.id,
          tableNumber: "HIST",
          notes: entry.item,
          subtotalAmount: entry.amount,
          totalAmount: entry.amount,
          status: "COMPLETED",
          paymentStatus: "PAID",
          paymentMethod: "CASH",
          createdAt: new Date(`${day.date}T12:00:00.000Z`),
          items: {
            create: [
              {
                menuItemId: manualItem.id,
                quantity: 1,
                menuItemNameSnapshot: entry.item,
                unitPriceSnapshot: entry.amount,
                lineTotal: entry.amount,
              },
            ],
          },
        },
      });

      count++;
      console.log(`imported ${num} — ${entry.item} — ₦${entry.amount}`);
    }
  }

  console.log(`\nDone. Imported ${count} orders under ${staff.firstName}.`);
  await rl.close();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
