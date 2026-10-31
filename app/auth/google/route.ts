import { NextResponse } from "next/server";
import { createAuthClient, safeNextPath } from "@/lib/auth";

function loginRedirect(origin: string, error: string) {
  return NextResponse.redirect(new URL(`/login?error=${error}`, origin), 303);
}

// Starts "Sign in with Google": asks Supabase for the Google URL, then sends the visitor
// there. A POST (from the button's form) so link prefetching can never trigger it.
export async function POST(request: Request) {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || new URL(request.url).origin;

  let next = "/portal";
  try {
    next = safeNextPath((await request.formData()).get("next"));
  } catch {
    // no form body: use the default
  }

  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) {
      console.error("Google sign-in could not start", error?.message);
      return loginRedirect(origin, "unavailable");
    }

    // Supabase only reveals that Google is not enabled when the URL is opened (it answers
    // with a raw JSON error). Check first so the visitor sees a friendly message instead.
    const probe = await fetch(data.url, { redirect: "manual" });
    if (probe.status < 300 || probe.status >= 400) {
      console.error("Google sign-in is not available (Supabase answered HTTP", probe.status + ")");
      return loginRedirect(origin, "unavailable");
    }

    return NextResponse.redirect(data.url, 303);
  } catch (err) {
    console.error("Google sign-in failed to start", (err as Error).message);
    return loginRedirect(origin, "unavailable");
  }
}
