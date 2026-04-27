import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

async function markPaid(formData: FormData) {
  "use server";

  const cookieStore = await cookies();
  const staffUserId = cookieStore.get("staff_user_id")?.value;
  const orderId = String(formData.get("orderId"));
  const paymentMethod = String(formData.get("paymentMethod") || "CASH");

  if (!staffUserId) redirect("/login");

  const order = await prisma.order.findFirst({
    where: { id: orderId, staffUserId },
  });

  if (!order) redirect("/my-orders");

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: "PAID",
      paymentMethod: paymentMethod as any,
    },
  });

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

  await prisma.order.update({
    where: { id: orderId },
    data: {
      tableNumber,
      notes,
    },
  });

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

  const order = await prisma.order.findFirst({
    where: { id, staffUserId },
    include: {
      items: {
        include: {
          modifiers: true,
        },
      },
    },
  });

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

          <Link href="/my-orders" className="rounded bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
            ← My Orders
          </Link>
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
              Mark as Paid
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
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
