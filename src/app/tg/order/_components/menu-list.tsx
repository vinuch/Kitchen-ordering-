"use client";

import type { MenuListItem } from "./types";

type Props = {
  items: MenuListItem[];
  selectedItemId: string | null;
  onSelect: (itemId: string) => void;
};

export function MenuList({ items, selectedItemId, onSelect }: Props) {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const selected = item.id === selectedItemId;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${
              selected
                ? "border-black bg-black text-white"
                : "border-gray-200 bg-white text-black"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-semibold">{item.name}</div>
                {item.description ? (
                  <div
                    className={`mt-1 text-sm ${
                      selected ? "text-gray-200" : "text-gray-600"
                    }`}
                  >
                    {item.description}
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 text-sm font-semibold">
                ₦{item.price.toLocaleString()}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
