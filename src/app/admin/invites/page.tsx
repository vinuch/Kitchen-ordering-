import { prisma } from "@/lib/prisma";
import { CopyButton } from "./copy-button";

export default async function AdminInvitesPage() {
  const invites = await prisma.staffInvite.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">Staff Invites</h1>

      {invites.map((invite) => {
        const url = `${process.env.NEXT_PUBLIC_APP_URL}/join/${invite.token}`;

        return (
          <div
            key={invite.id}
            className={`rounded-xl border p-4 shadow-sm ${
              invite.isActive
                ? "border-gray-200 bg-white"
                : "border-red-200 bg-red-50 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">
                  {invite.name || "Unnamed"}
                </div>

                <div className="text-xs text-gray-500">
                  {invite.role}
                </div>

                <div className="text-xs font-semibold">
                  {invite.isActive ? "Accepted" : "Revoked"}
                </div>
              </div>

              <a
                href={url}
                className="rounded bg-black px-3 py-2 text-sm font-semibold text-white"
              >
                Open
              </a>
            </div>

            <input
              readOnly
              value={url}
              className="mt-3 w-full rounded border px-3 py-2 text-xs"
            />

            <div className="mt-3 flex gap-2">
              <CopyButton text={url} />

              <a
                href={`https://wa.me/?text=${encodeURIComponent(url)}`}
                className="rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white"
              >
                WhatsApp
              </a>

              <form action={`/api/admin/invites/${invite.id}/revoke`} method="POST">
                <button
                  disabled={!invite.isActive}
                  className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Revoke
                </button>
              </form>
            </div>
          </div>
        );
      })}
    </main>
  );
}
