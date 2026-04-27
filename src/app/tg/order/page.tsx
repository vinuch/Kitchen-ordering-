import { Suspense } from "react";
import { TelegramOrderClient } from "./order-client";

export const dynamic = "force-dynamic";

export default function TelegramOrderPage() {
  return (
    <Suspense fallback={<main className="p-6 text-black">Loading order page...</main>}>
      <TelegramOrderClient />
    </Suspense>
  );
}
