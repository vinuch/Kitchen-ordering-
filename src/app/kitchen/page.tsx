import { prisma } from "@/lib/prisma";
import OrderActions from "../admin/OrderActions";

export const revalidate = 0;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function KitchenPage() {
  const orders = await prisma.order.findMany({
    where: {
      status: {
        in: ["PENDING", "PREPARING"],
      },
    },
    orderBy: [
      { status: "asc" },
      { createdAt: "asc" },
    ],
    include: {
      staffUser: true,
      items: {
        include: {
          modifiers: true,
        },
      },
    },
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f7f7",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "32px",
              }}
            >
              Kitchen Display
            </h1>
            <p
              style={{
                margin: "8px 0 0",
                color: "#666",
              }}
            >
              Active orders only — auto-refresh this page in the browser.
            </p>
          </div>

          <a
            href="/admin"
            style={{
              textDecoration: "none",
              border: "1px solid #ccc",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "#fff",
              color: "#111",
            }}
          >
            Open Admin
          </a>
        </div>

        {orders.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid #e5e5e5",
            }}
          >
            <h2 style={{ marginTop: 0 }}>No active orders</h2>
            <p style={{ marginBottom: 0, color: "#666" }}>
              New pending and preparing orders will appear here.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: "16px",
            }}
          >
            {orders.map((order) => (
              <section
                key={order.id}
                style={{
                  background: "#fff",
                  border: "2px solid #e5e5e5",
                  borderRadius: "18px",
                  padding: "20px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "12px",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "24px",
                      }}
                    >
                      {order.orderNumber}
                    </h2>
                    <p
                      style={{
                        margin: "8px 0 0",
                        color: "#555",
                        fontSize: "15px",
                      }}
                    >
                      {order.staffUser.firstName}
                      {order.staffUser.lastName ? ` ${order.staffUser.lastName}` : ""}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        padding: "6px 10px",
                        borderRadius: "999px",
                        fontSize: "13px",
                        fontWeight: 700,
                        background:
                          order.status === "PENDING" ? "#fff3cd" : "#d1ecf1",
                        color: "#222",
                      }}
                    >
                      {order.status}
                    </span>

                    <span
                      style={{
                        padding: "6px 10px",
                        borderRadius: "999px",
                        fontSize: "13px",
                        fontWeight: 700,
                        background:
                          order.paymentStatus === "PAID" ? "#d4edda" : "#f8d7da",
                        color: "#222",
                      }}
                    >
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "12px",
                    color: "#666",
                    fontSize: "14px",
                  }}
                >
                  <div>Time: {formatTime(order.createdAt)}</div>
                  <div>Total: {formatCurrency(order.totalAmount)}</div>
                </div>

                <div
                  style={{
                    marginTop: "18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        borderTop: "1px solid #eee",
                        paddingTop: "14px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "22px",
                          fontWeight: 700,
                          lineHeight: 1.3,
                        }}
                      >
                        {item.quantity} × {item.menuItemNameSnapshot}
                      </div>

                      {item.modifiers.length > 0 && (
                        <ul
                          style={{
                            margin: "10px 0 0",
                            paddingLeft: "18px",
                            color: "#444",
                            fontSize: "15px",
                          }}
                        >
                          {item.modifiers.map((modifier) => (
                            <li key={modifier.id}>
                              {modifier.modifierGroupNameSnapshot}:{" "}
                              {modifier.modifierOptionNameSnapshot}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>

                <OrderActions
                  orderNumber={order.orderNumber}
                  status={order.status}
                  paymentStatus={order.paymentStatus}
                />
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
