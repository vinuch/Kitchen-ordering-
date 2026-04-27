import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const cookieStore = await cookies();

  if (cookieStore.get("admin_auth")?.value !== "1") {
    return NextResponse.json(
      { ok: false, error: "Admin auth required" },
      { status: 401 }
    );
  }

  return null;
}
