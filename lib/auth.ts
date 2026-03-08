import { NextRequest, NextResponse } from "next/server";
export function auth(req: NextRequest) {
  if (req.headers.get("x-admin-password") !== process.env.ADMIN_PASSWORD)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}
