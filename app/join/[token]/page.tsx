export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Join Satellite Kitchen</h1>
      <p>Invite token accepted.</p>

      <form action={`/api/staff-invites/${token}/accept`} method="POST">
        <button className="rounded bg-black px-4 py-2 text-white">
          Accept invite
        </button>
      </form>
    </main>
  );
}
