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

  async function updateOrder(body: any) {
    await fetch(`/api/admin/orders/${orderNumber}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
      {/* Preparing */}
      {status === "PENDING" && (
        <button
          onClick={() => updateOrder({ status: "PREPARING" })}
          disabled={isPending}
        >
          🔥 Start Preparing
        </button>
      )}

      {/* Completed */}
      {status !== "COMPLETED" && (
        <button
          onClick={() => updateOrder({ status: "COMPLETED" })}
          disabled={isPending}
        >
          ✅ Completed
        </button>
      )}

      {/* Paid */}
      {paymentStatus === "UNPAID" && (
        <button
          onClick={() => updateOrder({ paymentStatus: "PAID" })}
          disabled={isPending}
        >
          💰 Mark Paid
        </button>
      )}

      {/* Unpaid (optional) */}
      {paymentStatus === "PAID" && (
        <button
          onClick={() => updateOrder({ paymentStatus: "UNPAID" })}
          disabled={isPending}
        >
          ↩️ Unpaid
        </button>
      )}
    </div>
  );
}
