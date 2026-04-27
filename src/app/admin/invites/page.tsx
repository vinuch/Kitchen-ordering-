import { prisma } from "@/lib/prisma";
import crypto from "crypto";

async function createInvite(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim() || "Server";
  const role = String(formData.get("role") ?? "").trim() || "SERVER";

  await prisma.staffInvite.create({
    data: {
      token: crypto.randomBytes(24).toString("hex"),
      name,
      role,
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
            placeholder="Server name"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black"
          />

          <label className="mt-3 block text-sm font-semibold">Role</label>
          <select
            name="role"
            defaultValue="SERVER"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black"
          >
            <option value="SERVER">Server</option>
            <option value="OPERATOR">Operator</option>
            <option value="CHEF">Chef</option>
          </select>

          <button className="mt-4 w-full rounded bg-black px-4 py-3 font-semibold text-white">
            Generate Invite
          </button>
        </form>

        <section className="mt-6 space-y-3">
          {invites.map((invite) => {
            const url = `${baseUrl}/join/${invite.token}`;

            return (
              <div key={invite.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold">{invite.name ?? "Server"}</div>
                    <div className="text-sm text-gray-600">{invite.role}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {invite.usedAt ? "Accepted" : "Pending"}
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
                  className="mt-3 w-full rounded border border-gray-300 px-3 py-2 text-xs text-black"
                />

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(url)}`}
                  className="mt-3 inline-block rounded bg-green-700 px-3 py-2 text-sm font-semibold text-white"
                >
                  Share WhatsApp
                </a>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
