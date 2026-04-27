export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const hasError = params.error === "invalid";

  return (
    <main className="min-h-screen bg-[#f7f7f7] p-6 text-black">
      <div className="mx-auto max-w-md rounded-xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Staff Login</h1>

        {hasError ? (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
            Invalid name or PIN. Try again.
          </div>
        ) : null}

        <form action="/api/staff-login" method="POST" className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-black">Name</label>
            <input
              name="name"
              required
              autoComplete="name"
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
              autoComplete="current-password"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-black"
            />
          </div>

          <button className="w-full rounded bg-black px-4 py-3 font-semibold text-white">
            Login
          </button>
        </form>
      </div>
    </main>
  );
}
