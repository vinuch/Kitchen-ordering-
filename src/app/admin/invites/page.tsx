export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { CopyButton } from "./copy-button";

async function createInvite(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim() || "SERVER";

  if (!name) return;

  const existingStaff = await prisma.staffUser.findFirst({
    where: {
      firstName: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  const existingInvite = await prisma.staffInvite.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
      usedAt: null,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (existingStaff || existingInvite) return;

  await prisma.staffInvite.create({
    data: {
      token: crypto.randomBytes(24).toString("hex"),
      name,
      role,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
}

export default async function AdminInvitesPage() {
  const invites = await prisma.staffInvite.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://kitchen-ordering-production.up.railway.app";

  return (
    <main className="min-h-screen bg-[#f7f7f7] p-4 text-black">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">Staff Invites</h1>
        <p className="mt-1 text-sm text-gray-600">Create and share staff signup links.</p>

        <form action={createInvite} className="mt-4 rounded-xl bg-white p-4 shadow-sm">
          <label className="block text-sm font-semibold">Name</label>
          <input
            name="name"
            required
            placeholder="Server name"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black"
          />

          <label className="mt-3 block text-sm font-semibold">Role</label>
          <select
            name="role"
            required
            defaultValue="SERVER"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black"
          >
            <option value="SERVER">Server</option>
            <option value="OPERATOR">Operator</option>
            <option value="CHEF">Chef</option>
          </select>

          <button className="mt-4 w-full rounded bg-black px-4 py-3 font-semibold text-white disabled:bg-gray-400">
            Generate Invite
          </button>

          <p className="mt-3 text-xs text-gray-500">
            Names must be unique because staff log in with name + PIN.
          </p>
        </form>

        <section className="mt-6 space-y-3">
          {invites.map((invite) => {
            const url = `${baseUrl}/join/${invite.token}`;
            const isExpired = Boolean(invite.expiresAt && invite.expiresAt < new Date());
            const isRevoked = Boolean(invite.revokedAt);
            const isActive = !isRevoked && !isExpired;
            const status = isRevoked
              ? "Revoked"
              : isExpired
                ? "Expired"
                : invite.usedAt
                  ? "Accepted"
                  : "Pending";

            return (
              <div
                key={invite.id}
                className={`rounded-xl p-4 shadow-sm ${
                  isActive ? "bg-white" : "border border-red-200 bg-red-50 opacity-75"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold">{invite.name ?? "Server"}</div>
                    <div className="text-sm text-gray-600">{invite.role}</div>
                    <div className="mt-1 text-xs text-gray-500">{status}</div>
                    {invite.expiresAt ? (
                      <div className="mt-1 text-xs text-gray-500">
                        Expires: {new Date(invite.expiresAt).toLocaleString()}
                      </div>
                    ) : null}
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
                  className="mt-3 w-full rounded border border-gray-300 px-3 py-2 text-xs text-black"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <CopyButton text={url} />

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(url)}`}
                    className="inline-block rounded bg-green-700 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Share WhatsApp
                  </a>

                  <form action={`/api/admin/invites/${invite.id}/revoke`} method="POST">
                    <button
                      disabled={!isActive}
                      className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
