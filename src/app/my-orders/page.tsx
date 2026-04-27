import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function MyOrdersPage() {
  const cookieStore = await cookies();
  const staffUserId = cookieStore.get("staff_user_id")?.value;

  if (!staffUserId) {
    return (
      <main className="min-h-screen bg-[#f7f7f7] p-6">
        <div className="mx-auto max-w-md rounded-xl bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold">My Orders</h1>
          <p className="mt-2 text-sm text-gray-600">Please log in first.</p>
          <Link href="/login" className="mt-4 inline-block rounded bg-black px-4 py-2 text-white">
            Login
          </Link>
        </div>
      </main>
    );
  }

  const orders = await prisma.order.findMany({
    where: { staffUserId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      items: {
        include: {
          modifiers: true,
        },
      },
    },
  });

  const ongoing = orders.filter((o) => o.status !== "COMPLETED");
  const past = orders.filter((o) => o.status === "COMPLETED");

  function OrderCard({ order }: { order: any }) {
    return (
      <Link href={`/my-orders/${order.id}`} className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-bold text-black">{order.orderNumber}</div>
            <div className="text-sm text-gray-600">Table: {order.tableNumber || "N/A"}</div>
            <div className="text-sm text-gray-600">
              {new Date(order.createdAt).toLocaleString()}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm font-semibold text-black">₦{order.totalAmount.toLocaleString()}</div>
            <div className="mt-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
              {order.status}
            </div>
            <div className="mt-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
              {order.paymentStatus}
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {order.items.map((item: any) => (
            <div key={item.id} className="rounded-lg bg-gray-50 p-2 text-sm">
              <div className="font-semibold text-black">
                {item.quantity}x {item.menuItemNameSnapshot}
              </div>

              {item.modifiers.length ? (
                <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                  {item.modifiers.map((m: any) => (
                    <div key={m.id}>
                      • {m.modifierGroupNameSnapshot}: {m.modifierOptionNameSnapshot}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Link>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] p-4 pb-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
<form action="/api/logout" method="POST">
  <button className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white">
    Logout
  </button>
</form>

          <div>
            <h1 className="text-2xl font-bold text-black">My Orders</h1>
            <p className="text-sm text-gray-600">Ongoing and past orders</p>
          </div>

          <Link href="/tg/order" className="rounded bg-black px-4 py-2 text-sm font-semibold text-white">
            New Order
          </Link>
        </div>

        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-700">
            Ongoing
          </h2>

          {ongoing.length ? (
            <div className="space-y-3">
              {ongoing.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-white p-4 text-sm text-gray-500 shadow-sm">
              No ongoing orders.
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-700">
            Past Orders
          </h2>

          {past.length ? (
            <div className="space-y-3">
              {past.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-white p-4 text-sm text-gray-500 shadow-sm">
              No past orders yet.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
