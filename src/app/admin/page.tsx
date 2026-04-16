"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";

type Order = any;

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => setOrders(data.orders || []));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin</h1>

      {orders.map((order: any) => (
        <div key={order.id}>
          <p>{order.id}</p>
        </div>
      ))}
    </div>
  );
}
