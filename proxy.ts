import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, ADMIN_PATH_HEADER } from "@/lib/admin-auth";
import { roleInToken } from "@/lib/jwt-role";

// Keeps the Supabase login sessions fresh (students: Google, cookie sb-<ref>-auth-token;
// admins: email + password, cookie sb-admin-auth-token): access tokens expire after about an hour, and
// Server Components cannot write cookies, so the refreshed cookies are set here.
// It does not decide who may see what; pages and API routes check the user themselves.
export async function proxy(request: NextRequest) {
  const isAdminArea = request.nextUrl.pathname.startsWith("/admin");

  // Admin pages learn which path was requested from this header (used to return there after login).
  const requestHeaders = new Headers(request.headers);
  if (isAdminArea) {
    requestHeaders.set(ADMIN_PATH_HEADER, request.nextUrl.pathname + request.nextUrl.search);
  } else {
    requestHeaders.delete(ADMIN_PATH_HEADER); // never trust a client-supplied value
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    ...(isAdminArea ? { cookieOptions: { name: ADMIN_COOKIE } } : {}),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser(); // refreshes the session cookies when needed

  // The database (RLS) reads the role from the access token, while the app reads it fresh from
  // the account. After a role is granted or removed the token can be out of date for up to an
  // hour, so the two would disagree (for example an admin would see empty lists). When they
  // differ, get a new token now; this is where the new cookies can be saved.
  if (isAdminArea && data.user) {
    const accountRole = (data.user.app_metadata?.role as string | undefined) ?? null;
    const { data: current } = await supabase.auth.getSession();
    if (roleInToken(current.session?.access_token) !== accountRole) {
      await supabase.auth.refreshSession();
    }
  }

  return response;
}

export const config = {
  matcher: ["/portal/:path*", "/login", "/api/portal/:path*", "/admin/:path*"],
};
