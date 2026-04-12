import { prisma } from "@/lib/prisma";
import OrderActions from "./OrderActions";

function formatCurrency(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function badgeClass(value: string) {
  const base = "inline-flex rounded-full px-2 py-1 text-xs font-medium";
  if (value === "PENDING") return `${base} bg-yellow-100 text-yellow-800`;
  if (value === "PREPARING") return `${base} bg-blue-100 text-blue-800`;
  if (value === "COMPLETED") return `${base} bg-green-100 text-green-800`;
  if (value === "PAID") return `${base} bg-green-100 text-green-800`;
  if (value === "UNPAID") return `${base} bg-red-100 text-red-800`;
  return `${base} bg-neutral-100 text-neutral-800`;
}

export default async function AdminPage() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startOfToday,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      staffUser: true,
      items: {
        include: {
          modifiers: true,
        },
      },
    },
  });

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-3">
          <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
            Kitchen Ordering MVP
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Today&apos;s Orders</h1>
          <p className="text-neutral-600">
            {orders.length} orders · Total value {formatCurrency(totalRevenue)}
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
            <p className="text-neutral-600">No orders yet today.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{order.orderNumber}</h2>
                    <p className="text-sm text-neutral-500">
                      {formatDate(order.createdAt)} ·{" "}
                      {order.staffUser.firstName}
                      {order.staffUser.lastName ? ` ${order.staffUser.lastName}` : ""}
                      {order.staffUser.username ? ` (@${order.staffUser.username})` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className={badgeClass(order.status)}>{order.status}</span>
                    <span className={badgeClass(order.paymentStatus)}>
                      {order.paymentStatus}
                    </span>
                    <span className="inline-flex rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-800">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="rounded-xl bg-neutral-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">
                            {item.menuItemNameSnapshot} × {item.quantity}
                          </p>
                          <p className="text-sm text-neutral-500">
                            Unit price: {formatCurrency(item.unitPriceSnapshot)}
                          </p>

                          {item.modifiers.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {item.modifiers.map((modifier) => (
                                <p
                                  key={modifier.id}
                                  className="text-sm text-neutral-700"
                                >
                                  - {modifier.modifierGroupNameSnapshot}:{" "}
                                  {modifier.modifierOptionNameSnapshot}
                                  {modifier.priceDeltaSnapshot > 0
                                    ? ` (+${formatCurrency(modifier.priceDeltaSnapshot)})`
                                    : ""}
                                </p>
                              ))}
                            </div>
                          )}
<OrderActions
  orderNumber={order.orderNumber}
  status={order.status}
  paymentStatus={order.paymentStatus}
/>  
                      </div>

                        <div className="text-right font-medium">
                          {formatCurrency(item.lineTotal)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
