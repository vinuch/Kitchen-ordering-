"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
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
  const [items, setItems] = useState<MenuListItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItemDetail | null>(null);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [loadingItem, setLoadingItem] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedOrderNumber, setSubmittedOrderNumber] = useState<
    string | null
  >(null);
  const [tableNumber, setTableNumber] = useState("");

  const [telegramUser, setTelegramUser] = useState<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    initData: string;
  } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
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
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function loadMenu() {
      try {
        setLoadingMenu(true);
        setMenuError(null);

        const res = await fetch("/api/menu");
        const json = await res.json();

        if (!res.ok || !json.ok) {
          setMenuError(json.error ?? "Failed to load menu");
          return;
        }

        setItems(json.items);

        if (json.items.length > 0) {
          setSelectedItemId(json.items[0].id);
        }
      } catch {
        setMenuError("Failed to load menu");
      } finally {
        setLoadingMenu(false);
      }
    }

    loadMenu();
  }, []);

  useEffect(() => {
    if (!selectedItemId) {
      setSelectedItem(null);
      return;
    }

    async function loadItem() {
      try {
        setLoadingItem(true);
        setItemError(null);

        const res = await fetch(`/api/menu/${selectedItemId}`);
        const json = await res.json();

        if (!res.ok || !json.ok) {
          setItemError(json.error ?? "Failed to load item");
          setSelectedItem(null);
          return;
        }

        setSelectedItem(json.item);
      } catch {
        setItemError("Failed to load item");
        setSelectedItem(null);
      } finally {
        setLoadingItem(false);
      }
    }

    loadItem();
  }, [selectedItemId]);

  function handleAddToOrder(line: CartLine) {
    setCart((prev) => [...prev, line]);
  }

  function removeCartLine(lineId: string) {
    setCart((prev) => prev.filter((line) => line.id !== lineId));
  }

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, line) => sum + line.total, 0);
  }, [cart]);

  async function handleSubmitOrder() {
    if (!telegramUser?.id || !telegramUser.initData) {
      setSubmitError("Open this page from Telegram to submit an order");
      return;
    }

    if (!tableNumber.trim()) {
      setSubmitError("Enter a table number");
      return;
    }

    if (cart.length === 0) {
      setSubmitError("Add at least one item to the order");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUserId: telegramUser.id,
          firstName: telegramUser.firstName,
          lastName: telegramUser.lastName,
          username: telegramUser.username,
          initData: telegramUser.initData,
          tableNumber: tableNumber.trim(),
          lines: cart.map((line) => ({
            menuItemId: line.menuItemId,
            quantity: line.quantity,
            selections: line.selections.map((selection) => ({
              modifierOptionId: selection.modifierOptionId,
              quantity: selection.quantity,
            })),
          })),
        }),
      });

      const json = (await res.json()) as CreateOrderResponse;

      if (!res.ok || !json.ok || !json.order) {
        throw new Error(json.error ?? "Failed to submit order");
      }

      setSubmittedOrderNumber(json.order.orderNumber);
      setCart([]);
      setTableNumber("");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit order"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] p-4">
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
      />

      <div className="mx-auto max-w-6xl">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-black">New Order</h1>
          <p className="mt-1 text-sm text-gray-600">
            Build an order inside Telegram.
          </p>
          <div className="mt-2 text-xs text-gray-500">
            {telegramUser
              ? `Telegram user: ${telegramUser.firstName ?? "Unknown"}${telegramUser.username ? ` (@${telegramUser.username})` : ""}`
              : "Telegram user not detected yet"}
          </div>
        </div>

        {submittedOrderNumber ? (
          <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800">
            Order submitted successfully. Order #: {submittedOrderNumber}
          </div>
        ) : null}

        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-black">
            Table Number
          </label>
          <input
            type="text"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="e.g. 7"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-black outline-none"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_340px]">
          <section>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-black">Menu</div>

              {loadingMenu ? (
                <div className="text-sm text-gray-600">Loading menu...</div>
              ) : menuError ? (
                <div className="text-sm text-red-600">{menuError}</div>
              ) : (
                <MenuList
                  items={items}
                  selectedItemId={selectedItemId}
                  onSelect={setSelectedItemId}
                />
              )}
            </div>
          </section>

          <section>
            {loadingItem ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-gray-600">Loading item...</div>
              </div>
            ) : itemError ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-red-600">{itemError}</div>
              </div>
            ) : (
              <MenuItemDetailPanel
                item={selectedItem}
                onAddToOrder={handleAddToOrder}
              />
            )}
          </section>

          <section>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-black">
                Review Order
              </div>

              {cart.length === 0 ? (
                <div className="text-sm text-gray-600">No items added yet.</div>
              ) : (
                <div className="space-y-3">
                  {cart.map((line) => (
                    <div
                      key={line.id}
                      className="rounded-2xl border border-gray-200 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-black">
                            {line.menuItemName}
                          </div>
                          <div className="text-sm text-gray-600">
                            Qty: {line.quantity}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeCartLine(line.id)}
                          className="text-sm font-medium text-red-600"
                        >
                          Remove
                        </button>
                      </div>

                      {line.selections.length > 0 ? (
                        <div className="mt-3 space-y-1 text-sm text-gray-700">
                          {line.selections.map((selection) => (
                            <div
                              key={`${line.id}-${selection.modifierOptionId}`}
                            >
                              {selection.modifierGroupName}:{" "}
                              {selection.modifierOptionName} x
                              {selection.quantity}
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-3 text-sm font-semibold text-black">
                        ₦{line.total.toLocaleString()}
                      </div>
                    </div>
                  ))}

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm text-gray-600">Table</div>
                      <div className="text-sm font-semibold text-black">
                        {tableNumber || "Not set"}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">Total</div>
                      <div className="text-xl font-bold text-black">
                        ₦{cartTotal.toLocaleString()}
                      </div>
                    </div>

                    {submitError ? (
                      <div className="mt-3 text-sm text-red-600">
                        {submitError}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleSubmitOrder}
                      disabled={submitting}
                      className="mt-4 w-full rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {submitting ? "Submitting..." : "Submit Order"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
