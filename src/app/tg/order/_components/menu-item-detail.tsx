"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CartLine,
  MenuItemDetail,
  PriceResponse,
  SelectionState,
} from "./types";

type Props = {
  item: MenuItemDetail | null;
  onAddToOrder: (line: CartLine) => void;
};

function getSelectionKey(groupId: string, optionId: string) {
  return `${groupId}:${optionId}`;
}

export function MenuItemDetailPanel({ item, onAddToOrder }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<SelectionState>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [priceState, setPriceState] = useState<PriceResponse | null>(null);
  const [pricing, setPricing] = useState(false);

  useEffect(() => {
    if (!item) return;

    setQuantity(1);
    setSelections({});
    setPriceState(null);

    const initialOpen: Record<string, boolean> = {};
    for (const group of item.modifierGroups) {
      initialOpen[group.id] = group.minSelect > 0;
    }
    setOpenGroups(initialOpen);
  }, [item]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!item) return counts;

    for (const group of item.modifierGroups) {
      counts[group.id] = 0;
      for (const option of group.options) {
        const key = getSelectionKey(group.id, option.id);
        counts[group.id] += selections[key] ?? 0;
      }
    }

    return counts;
  }, [item, selections]);

  const canPreviewPrice = useMemo(() => {
    if (!item) return false;

    for (const group of item.modifierGroups) {
      const count = groupCounts[group.id] ?? 0;
      if (count < group.minSelect) return false;
      if (count > group.maxSelect) return false;
    }

    return true;
  }, [item, groupCounts]);

  useEffect(() => {
    if (!item || !canPreviewPrice) {
      setPriceState(null);
      return;
    }

    const currentItem = item;
    const controller = new AbortController();

    async function runPricing() {
      try {
        setPricing(true);

        const payload = {
          menuItemId: currentItem.id,
          quantity,
          selections: currentItem.modifierGroups.flatMap((group) =>
            group.options.map((option) => ({
              modifierOptionId: option.id,
              quantity: selections[getSelectionKey(group.id, option.id)] ?? 0,
            }))
          ),
        };

        const res = await fetch("/api/orders/price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        const json = (await res.json()) as PriceResponse;
        setPriceState(json);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setPriceState({
            ok: false,
            error: "Could not preview price",
          });
        }
      } finally {
        setPricing(false);
      }
    }

    runPricing();
    return () => controller.abort();
  }, [item, quantity, selections, canPreviewPrice]);

  function toggleGroup(groupId: string) {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  }

  function setSingleSelection(groupId: string, optionId: string) {
    if (!item) return;

    const group = item.modifierGroups.find((g) => g.id === groupId);
    if (!group) return;

    const next: SelectionState = { ...selections };
    for (const option of group.options) {
      const key = getSelectionKey(groupId, option.id);
      next[key] = option.id === optionId ? 1 : 0;
    }

    setSelections(next);
  }

  function adjustMultiSelection(
    groupId: string,
    optionId: string,
    delta: number,
    maxSelect: number
  ) {
    const key = getSelectionKey(groupId, optionId);
    const current = selections[key] ?? 0;

    const groupCount = Object.entries(selections)
      .filter(([entryKey]) => entryKey.startsWith(`${groupId}:`))
      .reduce((sum, [, qty]) => sum + qty, 0);

    if (delta > 0 && groupCount >= maxSelect) return;

    setSelections((prev) => ({
      ...prev,
      [key]: Math.max(0, current + delta),
    }));
  }

  function getOptionQty(groupId: string, optionId: string) {
    return selections[getSelectionKey(groupId, optionId)] ?? 0;
  }

  function handleAddToOrder() {
    if (!priceState?.ok || !priceState.line) return;

    onAddToOrder({
      id: `${priceState.line.menuItemId}-${Date.now()}`,
      menuItemId: priceState.line.menuItemId,
      menuItemName: priceState.line.menuItemName,
      quantity: priceState.line.quantity,
      basePrice: priceState.line.basePrice,
      total: priceState.line.lineTotal,
      selections: priceState.line.selections,
    });
  }

  if (!item) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-gray-500">
          Select a menu item to start building an order.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="text-lg font-semibold text-black">{item.name}</div>
        {item.description ? (
          <div className="mt-1 text-xs text-gray-600">{item.description}</div>
        ) : null}
        <div className="mt-2 text-sm font-semibold text-black">
          Base: ₦{item.price.toLocaleString()}
        </div>
      </div>

      <div className="space-y-2 p-3">
        {item.modifierGroups.map((group) => {
          const count = groupCounts[group.id] ?? 0;
          const isOpen = openGroups[group.id] ?? false;
          const incomplete = count < group.minSelect;

          return (
            <div
              key={group.id}
              className="overflow-hidden rounded-xl border border-gray-200"
            >
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="flex w-full items-center justify-between bg-gray-50 px-3 py-2 text-left"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-black">{group.name}</div>
                  <div className="mt-0.5 text-[11px] text-gray-600">
                    {group.minSelect > 0
                      ? `Required • ${count}/${group.maxSelect}`
                      : `Optional • ${count}/${group.maxSelect}`}
                  </div>
                </div>

                <div
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                    incomplete
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {incomplete ? "Incomplete" : "Ready"}
                </div>
              </button>

              {isOpen ? (
                <div className="divide-y divide-gray-100 bg-white">
                  {group.options.map((option) => {
                    const qty = getOptionQty(group.id, option.id);
                    const isSingle = group.selectionType === "SINGLE";

                    return (
                      <div
                        key={option.id}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-black">
                            {option.name}
                          </div>
                          <div className="text-[11px] text-gray-600">
                            {option.priceDelta === 0
                              ? "Included"
                              : `+₦${option.priceDelta.toLocaleString()}`}
                          </div>
                        </div>

                        {isSingle ? (
                          <button
                            type="button"
                            onClick={() => setSingleSelection(group.id, option.id)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                              qty > 0
                                ? "bg-black text-white"
                                : "bg-gray-100 text-black"
                            }`}
                          >
                            {qty > 0 ? "Selected" : "Select"}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                adjustMultiSelection(group.id, option.id, -1, group.maxSelect)
                              }
                              className="h-8 w-8 rounded-full border border-gray-300 text-base"
                            >
                              -
                            </button>
                            <div className="w-5 text-center text-sm font-semibold text-black">
                              {qty}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                adjustMultiSelection(group.id, option.id, 1, group.maxSelect)
                              }
                              className="h-8 w-8 rounded-full border border-gray-300 text-base"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-100 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium text-gray-700">Qty</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-8 w-8 rounded-full border border-gray-300 text-base"
            >
              -
            </button>
            <div className="w-6 text-center font-semibold text-black">{quantity}</div>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="h-8 w-8 rounded-full border border-gray-300 text-base"
            >
              +
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-gray-50 p-3">
          {!canPreviewPrice ? (
            <div className="text-sm text-gray-600">
              Complete required selections to preview total.
            </div>
          ) : !priceState ? (
            <div className="text-sm text-gray-600">
              {pricing ? "Calculating..." : "Preparing preview..."}
            </div>
          ) : !priceState.ok || !priceState.line ? (
            <div className="text-sm text-red-600">
              {priceState.error ?? "Could not preview price"}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Line total</span>
                <span className="font-semibold text-black">
                  ₦{priceState.line.lineTotal.toLocaleString()}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddToOrder}
                className="mt-3 w-full rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white"
              >
                Add to Order
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
