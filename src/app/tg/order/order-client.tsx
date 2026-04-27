"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import { MenuList } from "./_components/menu-list";
import { MenuItemDetailPanel } from "./_components/menu-item-detail";
import type {
  CartLine,
  CreateOrderResponse,
  MenuItemDetail,
  MenuListItem,
} from "./_components/types";
import { getTelegramWebApp } from "./_components/telegram-webapp";

export function TelegramOrderClient() {
  const searchParams = useSearchParams();
  const editOrderId = searchParams.get("editOrderId");
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
  const [submittedOrderNumber, setSubmittedOrderNumber] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [loadedEditOrder, setLoadedEditOrder] = useState(false);

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
    if (!editOrderId || loadedEditOrder) return;

    async function loadEditOrder() {
      try {
        const res = await fetch(`/api/my-orders/${editOrderId}`);
        const json = await res.json();

        if (!res.ok || !json.ok || !json.order) {
          setSubmitError(json.error ?? "Failed to load order");
          return;
        }

        setTableNumber(json.order.tableNumber ?? "");

        setCart(
          json.order.items
            .filter((item: any) => item.menuItemId)
            .map((item: any) => ({
              id: item.id,
              menuItemId: item.menuItemId,
              menuItemName: item.menuItemNameSnapshot,
              quantity: item.quantity,
              basePrice: item.unitPriceSnapshot,
              total: item.lineTotal,
              selections: item.modifiers.map((m: any) => ({
                modifierGroupId: "",
                modifierGroupName: m.modifierGroupNameSnapshot,
                modifierOptionId: m.modifierOptionId,
                modifierOptionName: m.modifierOptionNameSnapshot,
                priceDelta: m.priceDeltaSnapshot,
                quantity: m.quantity,
              })),
            }))
        );

        setCartOpen(true);
        setLoadedEditOrder(true);
      } catch {
        setSubmitError("Failed to load order");
      }
    }

    loadEditOrder();
  }, [editOrderId, loadedEditOrder]);

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
    setDetailOpen(false);
    setCartOpen(true);
  }

  function removeCartLine(lineId: string) {
    setCart((prev) => prev.filter((line) => line.id !== lineId));
  }

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, line) => sum + line.total, 0);
  }, [cart]);

  async function handleSubmitOrder() {
    const hasWebStaffCookie =
      typeof document !== "undefined" &&
      document.cookie.includes("staff_user_id=");

    if ((!telegramUser?.id || !telegramUser.initData) && !hasWebStaffCookie) {
      setSubmitError("Join with an invite link before submitting an order");
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

      const res = await fetch(
        editOrderId ? `/api/orders/${editOrderId}/items` : "/api/orders",
        {
        method: editOrderId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUserId: telegramUser?.id,
          firstName: telegramUser?.firstName,
          lastName: telegramUser?.lastName,
          username: telegramUser?.username,
          initData: telegramUser?.initData,
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
      setCartOpen(false);

      const webApp = getTelegramWebApp();

      window.setTimeout(() => {
        webApp?.close?.();
      }, 700);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit order"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleSelectItem(itemId: string) {
    setSelectedItemId(itemId);
    setDetailOpen(true);
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] p-3 pb-28">
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
      />

      <div className="mx-auto max-w-7xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-black">{editOrderId ? "Edit Order" : "New Order"}</h1>
            <p className="mt-0.5 text-xs text-gray-600">Fast order entry</p>
          </div>

          <Link
            href="/my-orders"
            className="rounded-lg bg-white px-3 py-2 text-xs text-gray-700 shadow-sm"
          >
            ← My Orders
          </Link>
          <div className="rounded-lg bg-white px-3 py-2 text-xs text-gray-500 shadow-sm">
            {telegramUser
              ? `${telegramUser.firstName ?? "Unknown"}${telegramUser.username ? ` (@${telegramUser.username})` : ""}`
              : "Telegram user not detected"}
          </div>
        </div>

        {submittedOrderNumber ? (
          <div className="mb-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {editOrderId ? "Order updated." : `Order submitted. Order #: ${submittedOrderNumber}`}
          </div>
        ) : null}

        <div className="mb-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <label className="mb-1 block text-xs font-semibold text-black">
            Table Number
          </label>
          <input
            type="text"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="e.g. 7"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black outline-none"
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
          <section>
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
                Menu
              </div>

              {loadingMenu ? (
                <div className="text-sm text-gray-600">Loading menu...</div>
              ) : menuError ? (
                <div className="text-sm text-red-600">{menuError}</div>
              ) : (
                <MenuList
                  items={items}
                  selectedItemId={selectedItemId}
                  onSelect={handleSelectItem}
                />
              )}
            </div>
          </section>

          <section className="hidden lg:block">
            {loadingItem ? (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="text-sm text-gray-600">Loading item...</div>
              </div>
            ) : itemError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
                {itemError}
              </div>
            ) : (
              <MenuItemDetailPanel item={selectedItem} onAddToOrder={handleAddToOrder} />
            )}
          </section>

          <section className="hidden lg:block">
            <div className="sticky top-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Order
                </div>
                <div className="text-sm font-semibold text-black">
                  ₦{cartTotal.toLocaleString()}
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
                  No items yet.
                </div>
              ) : (
                <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                  {cart.map((line) => (
                    <div key={line.id} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-black">
                            {line.quantity}x {line.menuItemName}
                          </div>
                          {line.selections.length ? (
                            <div className="mt-1 space-y-0.5">
                              {line.selections.map((selection, idx) => (
                                <div
                                  key={`${line.id}-${idx}`}
                                  className="text-[11px] text-gray-600"
                                >
                                  • {selection.modifierGroupName}: {selection.modifierOptionName}
                                  {selection.quantity > 1 ? ` x${selection.quantity}` : ""}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-semibold text-black">
                            ₦{line.total.toLocaleString()}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCartLine(line.id)}
                            className="mt-1 text-[11px] text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {submitError ? (
                <div className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                  {submitError}
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={submitting || cart.length === 0}
                className="mt-3 w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? "Submitting..." : `{editOrderId ? "Save Updated Order" : "Submit Order"} • ₦${cartTotal.toLocaleString()}`}
              </button>
            </div>
          </section>
        </div>
      </div>

      {detailOpen ? (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setDetailOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-2xl bg-white p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-black">Item Details</div>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-black"
              >
                Close
              </button>
            </div>

            {loadingItem ? (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="text-sm text-gray-600">Loading item...</div>
              </div>
            ) : itemError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
                {itemError}
              </div>
            ) : (
              <MenuItemDetailPanel item={selectedItem} onAddToOrder={handleAddToOrder} />
            )}
          </div>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] lg:hidden">
        <button
          type="button"
          onClick={() => setCartOpen((v) => !v)}
          className="mb-2 flex w-full items-center justify-between rounded-xl bg-gray-100 px-4 py-3"
        >
          <span className="text-sm font-semibold text-black">
            Cart • {cart.length} item{cart.length === 1 ? "" : "s"}
          </span>
          <span className="text-sm font-semibold text-black">₦{cartTotal.toLocaleString()}</span>
        </button>

        {cartOpen ? (
          <div className="mb-2 max-h-48 space-y-2 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">No items yet.</div>
            ) : (
              cart.map((line) => (
                <div key={line.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-black">
                        {line.quantity}x {line.menuItemName}
                      </div>
                      {line.selections.length ? (
                        <div className="mt-1 space-y-0.5">
                          {line.selections.map((selection, idx) => (
                            <div key={`${line.id}-${idx}`} className="text-[11px] text-gray-600">
                              • {selection.modifierGroupName}: {selection.modifierOptionName}
                              {selection.quantity > 1 ? ` x${selection.quantity}` : ""}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-semibold text-black">
                        ₦{line.total.toLocaleString()}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCartLine(line.id)}
                        className="mt-1 text-[11px] text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}

        {submitError ? (
          <div className="mb-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
            {submitError}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSubmitOrder}
          disabled={submitting || cart.length === 0}
          className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Submitting..." : `{editOrderId ? "Save Updated Order" : "Submit Order"} • ₦${cartTotal.toLocaleString()}`}
        </button>
      </div>
    </main>
  );
}
