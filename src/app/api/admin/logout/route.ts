import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function POST() {
  const cookieStore = await cookies();

  cookieStore.set("admin_auth", "", {
    path: "/",
    maxAge: 0,
  });

  redirect("/admin-login");
}
