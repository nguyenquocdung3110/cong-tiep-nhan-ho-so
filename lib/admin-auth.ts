import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { roleFromAppMetadata, type AdminRole } from "@/lib/admin-accounts";
import { authEnv } from "@/lib/auth";

// Admin dashboard login: email + password through Supabase Auth, kept completely apart from
// the students' Google login:
//  - its own cookie, so the two sessions never overwrite each other;
//  - the role lives in the account's app_metadata.role ("admin" or "nhan_vien"), which only the
//    secret key can write (set with `npm run create-admin` / `npm run set-role`). An account
//    without one of these roles is refused, however it logs in. The same role is what the
//    database's RLS policies read from the access token, so the rules hold there too;
//  - email + password sign-up is closed in the database, so nobody can self-register.

export const ADMIN_COOKIE = "sb-admin-auth-token";
/** Set by proxy.ts on admin requests: the path (and query) being requested. */
export const ADMIN_PATH_HEADER = "x-admin-path";

// Roles (defined in admin-accounts.ts): admin = Quản trị viên (read + edit + delete + manage
// accounts), nhan_vien = Nhân viên (read only).
export { roleFromAppMetadata };
export type { AdminRole };

export type AdminUser = { id: string; email: string; role: AdminRole };

/** Supabase client bound to the ADMIN session cookie (not the students' one). */
export async function createAdminAuthClient() {
  const { url, key } = authEnv();
  const jar = await cookies();
  return createServerClient(url, key, {
    cookieOptions: { name: ADMIN_COOKIE },
    cookies: {
      getAll() {
        return jar.getAll();
      },
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Server Component: cookies are read-only. proxy.ts refreshes them instead.
        }
      },
    },
  });
}

/**
 * The logged-in team member, or null. The session is validated with Supabase Auth, and the
 * role is read from the account itself (fresh from Auth, not from a possibly stale token).
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  try {
    const supabase = await createAdminAuthClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const role = roleFromAppMetadata(data.user.app_metadata);
    if (!role) return null; // no role = no access to the dashboard
    return { id: data.user.id, email: data.user.email ?? "", role };
  } catch (err) {
    console.error("getAdminUser failed", (err as Error).message);
    return null; // on any error, deny
  }
}

/** For pages: send anyone who is not a logged-in admin to the admin login page. */
export async function requireAdmin(returnTo?: string): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) {
    // proxy.ts records the requested admin path so the visitor lands back on it after logging in
    const wanted = returnTo ?? (await headers()).get(ADMIN_PATH_HEADER) ?? "/admin";
    redirect(`/admin/login?next=${encodeURIComponent(safeAdminNext(wanted))}`);
  }
  return admin;
}

/** Only allow going back to a path inside the admin area (and never back to the login page). */
export function safeAdminNext(value: unknown): string {
  if (typeof value !== "string") return "/admin";
  if (value !== "/admin" && !value.startsWith("/admin/")) return "/admin";
  if (value.includes("\\") || value.startsWith("//")) return "/admin";
  if (value === "/admin/login" || value.startsWith("/admin/login?")) return "/admin";
  return value;
}

/** Who may change or delete data: admins only. Staff (nhan_vien) are read-only. */
export function canEdit(user: Pick<AdminUser, "role">): boolean {
  return user.role === "admin";
}

/** For server actions that change data: the logged-in admin, or null for staff / nobody. */
export async function getAdminWriter(): Promise<AdminUser | null> {
  const user = await getAdminUser();
  return user && canEdit(user) ? user : null;
}
