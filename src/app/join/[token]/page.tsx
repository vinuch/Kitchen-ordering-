export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className="min-h-screen bg-[#f7f7f7] p-6">
      <div className="mx-auto max-w-md rounded-xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Join Satellite Kitchen</h1>
        <p className="mt-2 text-sm text-gray-600">
          Create your staff login.
        </p>

        <form action={`/api/staff-invites/${token}/accept`} method="POST" className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold">Name</label>
            <input name="name" required className="mt-1 w-full rounded border px-3 py-2" placeholder="Your name" />
          </div>

          <div>
            <label className="block text-sm font-semibold">4-digit PIN</label>
            <input name="pin" required minLength={4} maxLength={4} inputMode="numeric" className="mt-1 w-full rounded border px-3 py-2" placeholder="1234" />
          </div>

          <button className="w-full rounded bg-black px-4 py-3 font-semibold text-white">
            Create account
          </button>
        </form>
      </div>
    </main>
  );
}
