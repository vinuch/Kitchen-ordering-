import { prisma } from "@/lib/prisma";

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;

  const invite = await prisma.staffInvite.findUnique({
    where: { token },
  });

  const unavailable =
    !invite ||
    invite.usedAt ||
    invite.revokedAt ||
    (invite.expiresAt && invite.expiresAt < new Date());

  if (unavailable) {
    return (
      <main className="min-h-screen bg-[#f7f7f7] p-6 text-black">
        <div className="mx-auto max-w-md rounded-xl bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold">Invite unavailable</h1>
          <p className="mt-2 text-sm text-gray-600">
            This invite has already been used, revoked, or expired.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] p-6 text-black">
      <div className="mx-auto max-w-md rounded-xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Join Satellite Kitchen</h1>
        <p className="mt-2 text-sm text-gray-600">
          Create your staff login for {invite.name ?? "staff"}.
        </p>

        {query.error ? (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
            {query.error === "duplicate"
              ? "That name already exists. Ask admin for a different name."
              : "Enter your name and a 4-digit PIN."}
          </div>
        ) : null}

        <form action={`/api/staff-invites/${token}/accept`} method="POST" className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-black">Name</label>
            <input
              name="name"
              required
              defaultValue={invite.name ?? ""}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-black">4-digit PIN</label>
            <input
              name="pin"
              required
              minLength={4}
              maxLength={4}
              type="password"
              inputMode="numeric"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black"
              placeholder="1234"
            />
          </div>

          <button className="w-full rounded bg-black px-4 py-3 font-semibold text-white">
            Create account
          </button>
        </form>
      </div>
    </main>
  );
}
