"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { MenuList } from "./_components/menu-list";
import { MenuItemDetailPanel } from "./_components/menu-item-detail";
import type {
  CartLine,
  CreateOrderResponse,
  MenuItemDetail,
  MenuListItem,
} from "./_components/types";

import { getTelegramWebApp } from "./_components/telegram-webapp";

export default function TelegramOrderPage() {
  const searchParams = useSearchParams();
  const editOrderId = searchParams.get("editOrderId");

  const [items, setItems] = useState<MenuListItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItemDetail | null>(null);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [tableNumber, setTableNumber] = useState("");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [telegramUser, setTelegramUser] = useState<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    initData: string;
  } | null>(null);

  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (!webApp?.initData) return;

    webApp.ready?.();
    webApp.expand?.();

    const user = webApp.initDataUnsafe?.user;
    if (!user?.id) return;

    setTelegramUser({
      id: String(user.id),
      firstName: user.first_name ?? null,
      lastName: user.last_name ?? null,
      username: user.username ?? null,
      initData: webApp.initData,
    });
  }, []);

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((json) => {
        setItems(json.items || []);
        if (json.items?.length) setSelectedItemId(json.items[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selectedItemId) return;

    fetch(`/api/menu/${selectedItemId}`)
      .then((r) => r.json())
      .then((json) => setSelectedItem(json.item || null));
  }, [selectedItemId]);

  function handleAddToOrder(line: CartLine) {
    setCart((prev) => [...prev, line]);
  }

  function removeCartLine(lineId: string) {
    setCart((prev) => prev.filter((l) => l.id !== lineId));
  }

  const cartTotal = useMemo(
    () => cart.reduce((sum, l) => sum + l.total, 0),
    [cart]
  );

  async function handleSubmitOrder() {
    const hasCookie =
      typeof document !== "undefined" &&
      document.cookie.includes("staff_user_id=");

    if ((!telegramUser?.id || !telegramUser.initData) && !hasCookie) {
      setSubmitError("Join with an invite link before submitting an order");
      return;
    }

    if (!tableNumber.trim()) {
      setSubmitError("Enter a table number");
      return;
    }

    if (!cart.length) {
      setSubmitError("Add at least one item");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const endpoint = editOrderId
        ? `/api/orders/${editOrderId}/items`
        : "/api/orders";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: editOrderId,
          telegramUserId: telegramUser?.id,
          firstName: telegramUser?.firstName,
          username: telegramUser?.username,
          tableNumber,
          lines: cart.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            selections: l.selections.map((s) => ({
              modifierOptionId: s.modifierOptionId,
              quantity: s.quantity,
            })),
          })),
        }),
      });

      const json = await res.json();
      console.log("API RESPONSE:", json);

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed");
      }

      alert(editOrderId ? "Order updated ✅" : "Order created ✅");

    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] p-3 pb-28">
      <Script src="https://telegram.org/js/telegram-web-app.js" />

      <div className="mb-3 flex justify-between">
        <h1 className="text-xl font-bold">
          {editOrderId ? "Edit Order" : "New Order"}
        </h1>

        <Link href="/my-orders">← My Orders</Link>
      </div>

      <input
        placeholder="Table"
        value={tableNumber}
        onChange={(e) => setTableNumber(e.target.value)}
        className="mb-3 w-full border p-2"
      />

      <MenuList
        items={items}
        selectedItemId={selectedItemId}
        onSelect={setSelectedItemId}
      />

      <MenuItemDetailPanel item={selectedItem} onAddToOrder={handleAddToOrder} />

      <div className="mt-4">
        {cart.map((l) => (
          <div key={l.id} className="border p-2 mb-2">
            {l.quantity}x {l.menuItemName}
            <button
              className="ml-2 text-red-600"
              onClick={() => removeCartLine(l.id)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {submitError && (
        <div className="text-red-600 mt-2">{submitError}</div>
      )}

      <button
        onClick={handleSubmitOrder}
        disabled={submitting}
        className="fixed bottom-0 left-0 w-full bg-black text-white p-4"
      >
        {editOrderId ? "Save Updated Order" : "Submit Order"} • ₦
        {cartTotal.toLocaleString()}
      </button>
    </main>
  );
}
