import Image from "next/image";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16">
        <div className="w-full rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">
            Kitchen Ordering MVP
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            Internal Telegram Ordering System
          </h1>

          <p className="mt-4 text-base leading-7 text-neutral-600">
            This app will power a Telegram-based internal kitchen ordering flow
            for staff. Phase 1 setup is working if this page loads.
          </p>

          <div className="mt-6 rounded-xl bg-neutral-100 p-4 text-sm text-neutral-700">
            Next checkpoint: health route, Prisma client, and local dev verify.
          </div>
        </div>
      </div>
    </main>
  );
}
