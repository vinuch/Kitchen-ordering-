"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
};

export default function OrderActions({
  orderNumber,
  status,
  paymentStatus,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function updateOrder(body: {
    status?: "PENDING" | "PREPARING" | "COMPLETED";
    paymentStatus?: "UNPAID" | "PAID";
  }) {
    const res = await fetch(`/api/admin/orders/${orderNumber}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Failed to update order");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        marginTop: "12px",
      }}
    >
      {status === "PENDING" && (
        <button
          onClick={() => updateOrder({ status: "PREPARING" })}
          disabled={isPending}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          🔥 Start Preparing
        </button>
      )}

      {status !== "COMPLETED" && (
        <button
          onClick={() => updateOrder({ status: "COMPLETED" })}
          disabled={isPending}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          ✅ Completed
        </button>
      )}

      {paymentStatus === "UNPAID" && (
        <button
          onClick={() => {}} disabled title="Use Telegram payment buttons for now"
          disabled={isPending}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          💰 Mark Paid
        </button>
      )}

      {paymentStatus === "PAID" && (
        <button
          onClick={() => updateOrder({ paymentStatus: "UNPAID" })}
          disabled={isPending}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          ↩️ Mark Unpaid
        </button>
      )}
    </div>
  );
}
