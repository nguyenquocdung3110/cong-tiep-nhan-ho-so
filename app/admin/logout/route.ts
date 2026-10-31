import { NextResponse } from "next/server";
import { createAdminAuthClient } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || new URL(request.url).origin;
  try {
    const supabase = await createAdminAuthClient();
    await supabase.auth.signOut(); // ends this admin session; students' Google sessions are separate
  } catch (err) {
    console.error("Admin sign-out failed", (err as Error).message);
  }
  return NextResponse.redirect(new URL("/admin/login", origin), 303);
}
