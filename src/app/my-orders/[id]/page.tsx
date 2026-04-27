import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

async function sendTelegramMessage(
  chatId: string,
  text: string,
  extra?: Record<string, unknown>
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...(extra ?? {}),
    }),
  });
}

function paymentLabel(method: string) {
  if (method === "TRANSFER") return "🏦 Transfer";
  if (method === "POS") return "💳 POS";
  return "💵 Cash";
}


async function recalcOrderTotal(orderId: string) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
  });

  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);

  await prisma.order.update({
    where: { id: orderId },
    data: {
      subtotalAmount: total,
      totalAmount: total,
    },
  });
}

async function markPaid(formData: FormData) {
  "use server";

  const cookieStore = await cookies();
  const staffUserId = cookieStore.get("staff_user_id")?.value;
  const staffName = cookieStore.get("staff_name")?.value ?? "Staff";
  const orderId = String(formData.get("orderId"));
  const paymentMethod = String(formData.get("paymentMethod") || "CASH");

  if (!staffUserId) redirect("/login");

  const order = await prisma.order.findFirst({
    where: { id: orderId, staffUserId },
    include: { items: { include: { modifiers: true } } },
  });

  if (!order) redirect("/my-orders");

  if (order.paymentStatus === "PAID") {
    redirect(`/my-orders/${orderId}`);
  }

  const operatorIds = (process.env.OPERATOR_CHAT_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const message = [
    "🧾 Payment confirmation requested",
    "",
    `Order: ${order.orderNumber}`,
    `Table: ${order.tableNumber || "N/A"}`,
    `Waiter: ${staffName}`,
    `Method: ${paymentLabel(paymentMethod)}`,
    `Total: ₦${order.totalAmount.toLocaleString()}`,
    "",
    "Confirm payment below.",
  ].join("
");

  for (const opId of operatorIds) {
    await sendTelegramMessage(opId, message, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `✅ Confirm ${paymentLabel(paymentMethod)}`,
              callback_data:
                paymentMethod === "TRANSFER"
                  ? `paid_transfer:${order.orderNumber}`
                  : paymentMethod === "POS"
                    ? `paid_pos:${order.orderNumber}`
                    : `paid_cash:${order.orderNumber}`,
            },
          ],
        ],
      },
    });
  }

  redirect(`/my-orders/${orderId}`);
}

async function updateOrder(formData: FormData) {
  "use server";

  const cookieStore = await cookies();
  const staffUserId = cookieStore.get("staff_user_id")?.value;
  const orderId = String(formData.get("orderId"));
  const tableNumber = String(formData.get("tableNumber") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!staffUserId) redirect("/login");

  const order = await prisma.order.findFirst({
    where: { id: orderId, staffUserId },
  });

  if (!order) redirect("/my-orders");
  if (order.paymentStatus === "PAID") redirect(`/my-orders/${orderId}`);

  await prisma.order.update({
    where: { id: orderId },
    data: { tableNumber, notes },
  });

  redirect(`/my-orders/${orderId}`);
}

async function addItemToOrder(formData: FormData) {
  "use server";

  const cookieStore = await cookies();
  const staffUserId = cookieStore.get("staff_user_id")?.value;
  const orderId = String(formData.get("orderId"));
  const menuItemId = String(formData.get("menuItemId"));
  const quantity = Math.max(1, Number(formData.get("quantity") || 1));

  if (!staffUserId) redirect("/login");

  const order = await prisma.order.findFirst({
    where: { id: orderId, staffUserId },
  });

  if (!order) redirect("/my-orders");
  if (order.paymentStatus === "PAID") redirect(`/my-orders/${orderId}`);

  const menuItem = await prisma.menuItem.findFirst({
    where: { id: menuItemId, isActive: true },
  });

  if (!menuItem) redirect(`/my-orders/${orderId}`);

  await prisma.orderItem.create({
    data: {
      orderId,
      menuItemId: menuItem.id,
      menuItemNameSnapshot: menuItem.name,
      unitPriceSnapshot: menuItem.price,
      quantity,
      lineTotal: menuItem.price * quantity,
    },
  });

  await recalcOrderTotal(orderId);

  redirect(`/my-orders/${orderId}`);
}

async function removeItemFromOrder(formData: FormData) {
  "use server";

  const cookieStore = await cookies();
  const staffUserId = cookieStore.get("staff_user_id")?.value;
  const orderId = String(formData.get("orderId"));
  const orderItemId = String(formData.get("orderItemId"));

  if (!staffUserId) redirect("/login");

  const order = await prisma.order.findFirst({
    where: { id: orderId, staffUserId },
  });

  if (!order) redirect("/my-orders");
  if (order.paymentStatus === "PAID") redirect(`/my-orders/${orderId}`);

  await prisma.orderItem.delete({
    where: { id: orderItemId },
  });

  await recalcOrderTotal(orderId);

  redirect(`/my-orders/${orderId}`);
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const staffUserId = cookieStore.get("staff_user_id")?.value;

  if (!staffUserId) redirect("/login");

  const { id } = await params;

  const [order, menuItems] = await Promise.all([
    prisma.order.findFirst({
      where: { id, staffUserId },
      include: {
        items: {
          include: {
            modifiers: true,
          },
        },
      },
    }),
    prisma.menuItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  if (!order) {
    return (
      <main className="min-h-screen bg-[#f7f7f7] p-6 text-black">
        <div className="mx-auto max-w-md rounded-xl bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold">Order not found</h1>
          <Link href="/my-orders" className="mt-4 inline-block rounded bg-black px-4 py-2 text-white">
            Back to My Orders
          </Link>
        </div>
      </main>
    );
  }

  const canEdit = order.paymentStatus !== "PAID";

  return (
    <main className="min-h-screen bg-[#f7f7f7] p-4 pb-24 text-black">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
            <p className="text-sm text-gray-600">
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="flex gap-2">
            {canEdit ? (
              <Link href={`/tg/order?editOrderId=${order.id}`} className="rounded bg-black px-4 py-2 text-sm font-semibold text-white">
                Edit Items
              </Link>
            ) : null}
            <Link href="/my-orders" className="rounded bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
              ← My Orders
            </Link>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-gray-600">Status</div>
              <div className="font-bold">{order.status}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Payment</div>
              <div className="font-bold">{order.paymentStatus}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Total</div>
              <div className="font-bold">₦{order.totalAmount.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {canEdit ? (
        <form action={updateOrder} className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <input type="hidden" name="orderId" value={order.id} />

          <label className="block text-sm font-semibold text-black">Table Number</label>
          <input
            name="tableNumber"
            defaultValue={order.tableNumber ?? ""}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black"
          />

          <label className="mt-3 block text-sm font-semibold text-black">Notes</label>
          <textarea
            name="notes"
            defaultValue={order.notes ?? ""}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black"
            rows={3}
          />

          <button className="mt-4 w-full rounded bg-black px-4 py-3 font-semibold text-white">
            Save Changes
          </button>
        </form>
        ) : (
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 text-sm font-semibold text-gray-600 shadow-sm">
            This order is paid and locked from editing.
          </div>
        )}

        {canEdit ? (
        <form action={addItemToOrder} className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <input type="hidden" name="orderId" value={order.id} />

          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
            Add Item
          </h2>

          <label className="block text-sm font-semibold text-black">Menu Item</label>
          <select
            name="menuItemId"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black"
          >
            {menuItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — ₦{item.price.toLocaleString()}
              </option>
            ))}
          </select>

          <label className="mt-3 block text-sm font-semibold text-black">Quantity</label>
          <input
            name="quantity"
            type="number"
            min="1"
            defaultValue="1"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black"
          />

          <button className="mt-4 w-full rounded bg-black px-4 py-3 font-semibold text-white">
            Add Item
          </button>
        </form>
        ) : null}

        {order.paymentStatus !== "PAID" ? (
          <form action={markPaid} className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <input type="hidden" name="orderId" value={order.id} />

            <label className="block text-sm font-semibold text-black">Payment Method</label>
            <select
              name="paymentMethod"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black"
              defaultValue="CASH"
            >
              <option value="CASH">Cash</option>
              <option value="TRANSFER">Transfer</option>
              <option value="POS">POS</option>
            </select>

            <button className="mt-4 w-full rounded bg-green-700 px-4 py-3 font-semibold text-white">
              Request Payment Confirmation
            </button>
          </form>
        ) : null}

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
            Items
          </h2>

          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="rounded-lg bg-gray-50 p-3">
                <div className="flex justify-between gap-3">
                  <div className="font-semibold">
                    {item.quantity}x {item.menuItemNameSnapshot}
                  </div>
                  <div className="font-semibold">
                    ₦{item.lineTotal.toLocaleString()}
                  </div>
                </div>

                {item.modifiers.length ? (
                  <div className="mt-1 space-y-0.5 text-sm text-gray-600">
                    {item.modifiers.map((m) => (
                      <div key={m.id}>
                        • {m.modifierGroupNameSnapshot}: {m.modifierOptionNameSnapshot}
                      </div>
                    ))}
                  </div>
                ) : null}

                {canEdit ? (
                <form action={removeItemFromOrder} className="mt-3">
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="orderItemId" value={item.id} />
                  <button className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white">
                    Remove Item
                  </button>
                </form>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
