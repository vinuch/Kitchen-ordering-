"use client";

import Link from "next/link";
import { useState } from "react";

export function MobileDrawer({
  isStaff,
  isAdmin,
}: {
  isStaff: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-full bg-black px-4 py-3 text-sm font-bold text-white shadow-lg"
      >
        ☰
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] bg-black/50" onClick={() => setOpen(false)}>
          <aside
            className="h-full w-72 bg-white p-5 text-black shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">Menu</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded bg-gray-100 px-3 py-2 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <nav className="space-y-3">
              {isStaff ? (
                <>
                  <Link onClick={() => setOpen(false)} href="/my-orders" className="block rounded bg-gray-100 px-4 py-3 font-semibold">
                    My Orders
                  </Link>
                  <Link onClick={() => setOpen(false)} href="/tg/order" className="block rounded bg-gray-100 px-4 py-3 font-semibold">
                    New Order
                  </Link>
                  <form action="/api/logout" method="POST">
                    <button className="w-full rounded bg-red-600 px-4 py-3 text-left font-semibold text-white">
                      Staff Logout
                    </button>
                  </form>
                </>
              ) : (
                <Link onClick={() => setOpen(false)} href="/login" className="block rounded bg-gray-100 px-4 py-3 font-semibold">
                  Staff Login
                </Link>
              )}

              {isAdmin ? (
                <>
                  <div className="pt-4 text-xs font-bold uppercase tracking-wide text-gray-500">
                    Admin
                  </div>
                  <Link onClick={() => setOpen(false)} href="/admin/invites" className="block rounded bg-gray-100 px-4 py-3 font-semibold">
                    Invites
                  </Link>
                  <Link onClick={() => setOpen(false)} href="/admin/users" className="block rounded bg-gray-100 px-4 py-3 font-semibold">
                    Staff Users
                  </Link>
                  <Link onClick={() => setOpen(false)} href="/admin" className="block rounded bg-gray-100 px-4 py-3 font-semibold">
                    Admin Home
                  </Link>
                  <form action="/api/admin/logout" method="POST">
                    <button className="w-full rounded bg-red-600 px-4 py-3 text-left font-semibold text-white">
                      Admin Logout
                    </button>
                  </form>
                </>
              ) : (
                <Link onClick={() => setOpen(false)} href="/admin-login" className="block rounded bg-gray-100 px-4 py-3 font-semibold">
                  Admin Login
                </Link>
              )}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
