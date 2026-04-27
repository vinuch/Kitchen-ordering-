import { verifySameOrigin } from "@/lib/security/csrf";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function POST(req: Request) {
  const csrfError = await verifySameOrigin(req);
  if (csrfError) return csrfError;

  const cookieStore = await cookies();

  cookieStore.set("admin_auth", "", {
    path: "/",
    maxAge: 0,
  });

  redirect("/admin-login");
}
