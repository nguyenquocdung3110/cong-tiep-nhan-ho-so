import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/auth";

export async function POST(request: Request) {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || new URL(request.url).origin;
  try {
    const supabase = await createAuthClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Sign-out failed", (err as Error).message);
  }
  return NextResponse.redirect(new URL("/login", origin), 303);
}
