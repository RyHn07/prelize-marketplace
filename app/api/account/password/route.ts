import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { getCurrentUserFromCookie } from "@/lib/auth/session";
import { query } from "@/lib/db";

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    currentPassword?: unknown;
    newPassword?: unknown;
  } | null;
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current password and new password are required." }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 });
  }

  const userResult = await query<{ password_hash: string | null }>(
    "select password_hash from public.users where id = $1 limit 1",
    [currentUser.id],
  );
  const passwordHash = userResult.rows[0]?.password_hash;
  const isCurrentPasswordValid = passwordHash ? await bcrypt.compare(currentPassword, passwordHash) : false;

  if (!isCurrentPasswordValid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const nextPasswordHash = await bcrypt.hash(newPassword, 10);
  await query("update public.users set password_hash = $1, updated_at = now() where id = $2", [
    nextPasswordHash,
    currentUser.id,
  ]);

  return NextResponse.json({ success: true });
}
