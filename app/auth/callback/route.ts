import { NextResponse } from "next/server";
import { createAuthClient, safeNextPath } from "@/lib/auth";

// Google sends the visitor back here with a one-time code. Swap it for a session
// (stored in cookies), then continue to the portal.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || url.origin;
  const to = (path: string) => NextResponse.redirect(new URL(path, origin), 303);

  if (url.searchParams.get("error")) return to("/login?error=cancelled");

  const code = url.searchParams.get("code");
  if (!code) return to("/login?error=failed");

  try {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Sign-in code exchange failed", error.message);
      return to("/login?error=failed");
    }
  } catch (err) {
    console.error("Sign-in callback failed", (err as Error).message);
    return to("/login?error=failed");
  }

  return to(safeNextPath(url.searchParams.get("next")));
}
