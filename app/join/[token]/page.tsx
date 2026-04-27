import { prisma } from "@/lib/prisma";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invite = await prisma.staffInvite.findUnique({
    where: { token },
  });

  if (!invite) return <main className="p-6">Invalid invite.</main>;
  if (invite.usedAt) return <main className="p-6">Invite already used.</main>;

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Join Satellite Kitchen</h1>
      <p>Name: {invite.name ?? "Server"}</p>
      <p>Role: {invite.role}</p>

      <form action={`/api/staff-invites/${token}/accept`} method="POST">
        <button className="rounded bg-black px-4 py-2 text-white">
          Accept invite
        </button>
      </form>
    </main>
  );
}
