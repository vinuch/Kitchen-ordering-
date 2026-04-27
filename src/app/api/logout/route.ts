import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function POST() {
  const cookieStore = await cookies();

  cookieStore.set("staff_user_id", "", {
    path: "/",
    maxAge: 0,
  });

  cookieStore.set("staff_name", "", {
    path: "/",
    maxAge: 0,
  });

  redirect("/login");
}
