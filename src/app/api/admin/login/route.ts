import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function POST(req: Request) {
  const form = await req.formData();
  const pin = String(form.get("pin") ?? "");

  if (pin !== process.env.ADMIN_PIN) {
    redirect("/admin-login?error=invalid");
  }

  const cookieStore = await cookies();

  cookieStore.set("admin_auth", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  redirect("/admin/invites");
}
