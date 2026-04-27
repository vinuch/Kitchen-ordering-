import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin_auth")?.value === "1";

  if (!isAdmin) {
    return NextResponse.json(
      { ok: false, error: "Admin auth required" },
      { status: 401 }
    );
  }

  return null;
}
