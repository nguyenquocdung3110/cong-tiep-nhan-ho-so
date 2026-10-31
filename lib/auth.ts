import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Login is "Sign in with Google" through Supabase Auth. The session lives in cookies
// managed by @supabase/ssr; proxy.ts refreshes it. The browser never gets the secret key.

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string | null;
};

export function authEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Thiếu SUPABASE_URL hoặc SUPABASE_PUBLISHABLE_KEY");
  }
  return { url, key };
}

/** Supabase client bound to the visitor's session cookies (publishable key). */
export async function createAuthClient() {
  const { url, key } = authEnv();
  const jar = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return jar.getAll();
      },
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. Harmless:
          // proxy.ts refreshes the session cookies on every request that needs them.
        }
      },
    },
  });
}

/**
 * The logged-in user, or null. Uses getUser(), which asks Supabase Auth to validate the
 * session instead of trusting the cookie's contents.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
    const name = [meta.full_name, meta.name].find((v) => typeof v === "string" && v.trim());
    return {
      id: data.user.id,
      email: data.user.email ?? null,
      name: typeof name === "string" ? name.trim() : null,
    };
  } catch (err) {
    console.error("getCurrentUser failed", (err as Error).message);
    return null;
  }
}

/** Only allow redirecting to a path on this site (blocks open redirects like //evil.com). */
export function safeNextPath(value: unknown, fallback = "/portal"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
