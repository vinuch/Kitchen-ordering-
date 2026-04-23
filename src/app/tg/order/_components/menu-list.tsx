"use client";

import type { MenuListItem } from "./types";

type Props = {
  items: MenuListItem[];
  selectedItemId: string | null;
  onSelect: (itemId: string) => void;
};

export function MenuList({ items, selectedItemId, onSelect }: Props) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const selected = item.id === selectedItemId;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`w-full rounded-xl border px-3 py-2 text-left transition ${
              selected
                ? "border-black bg-black text-white"
                : "border-gray-200 bg-white text-black"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{item.name}</div>
                {item.description ? (
                  <div
                    className={`mt-0.5 line-clamp-1 text-xs ${
                      selected ? "text-gray-200" : "text-gray-500"
                    }`}
                  >
                    {item.description}
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 text-xs font-semibold">
                ₦{item.price.toLocaleString()}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
