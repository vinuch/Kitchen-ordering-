import { NextResponse } from "next/server";

export async function verifySameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  if (!origin || !host) return null;

  try {
    if (new URL(origin).host !== host) {
      return NextResponse.json({ ok: false, error: "CSRF blocked" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid origin" }, { status: 403 });
  }

  return null;
}
