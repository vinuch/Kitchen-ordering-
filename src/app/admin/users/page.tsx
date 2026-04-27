export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminUsersPage() {
  const users = await prisma.staffUser.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  return (
    <main className="min-h-screen bg-[#f7f7f7] p-4 text-black">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Staff Users</h1>
            <p className="text-sm text-gray-600">Signed up staff accounts</p>
          </div>

          <Link href="/admin/invites" className="rounded bg-black px-4 py-2 text-sm font-semibold text-white">
            Invites
          </Link>
        </div>

        <div className="space-y-3">
          {users.map((user) => {
            const isWebUser = user.telegramUserId.startsWith("web:");

            return (
              <div key={user.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold">{user.firstName}</div>
                    <div className="text-sm text-gray-600">
                      {isWebUser ? "Web staff" : "Telegram staff"}
                    </div>
                    <div className="text-xs text-gray-500">
                      Joined: {new Date(user.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                      {user.isActive ? "Active" : "Inactive"}
                    </div>
                    <div className="mt-2 text-sm font-semibold">
                      {user.orders.length} recent orders
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded bg-gray-50 p-3 text-xs text-gray-600">
                  <div>ID: {user.id}</div>
                  <div>Login key: {user.telegramUserId}</div>
                </div>

                <div className="mt-3">
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-700">
                    Recent Orders
                  </h2>

                  {user.orders.length ? (
                    <div className="space-y-2">
                      {user.orders.map((order) => (
                        <div key={order.id} className="flex justify-between rounded bg-gray-50 p-2 text-sm">
                          <span>{order.orderNumber}</span>
                          <span>₦{order.totalAmount.toLocaleString()} · {order.status} · {order.paymentStatus}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded bg-gray-50 p-2 text-sm text-gray-500">
                      No orders yet.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
