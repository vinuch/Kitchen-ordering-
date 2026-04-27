export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f7] p-6 text-black">
      <div className="mx-auto max-w-md rounded-xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Admin Login</h1>

        <form action="/api/admin/login" method="POST" className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-black">Admin PIN</label>
            <input
              name="pin"
              required
              type="password"
              inputMode="numeric"
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
