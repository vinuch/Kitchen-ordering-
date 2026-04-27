export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f7] p-6">
      <div className="mx-auto max-w-md rounded-xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Staff Login</h1>

        <form action="/api/staff-login" method="POST" className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold">Name</label>
            <input name="name" required className="mt-1 w-full rounded border px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-semibold">4-digit PIN</label>
            <input name="pin" required minLength={4} maxLength={4} inputMode="numeric" className="mt-1 w-full rounded border px-3 py-2" />
          </div>

          <button className="w-full rounded bg-black px-4 py-3 font-semibold text-white">
            Login
          </button>
        </form>
      </div>
    </main>
  );
}
