"use server";

import { redirect } from "next/navigation";
import { createAdminAuthClient, roleFromAppMetadata, safeAdminNext } from "@/lib/admin-auth";

// `email` is sent back so the form can keep it after a failed attempt (never the password).
export type LoginState = { error: string; email: string } | null;

// One message for every failure (unknown email, wrong password, not an admin): the form must
// not reveal which emails exist or which accounts are admins.
const FAILED_MESSAGE = "Email hoặc mật khẩu không đúng.";

export async function adminLoginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeAdminNext(formData.get("next"));

  if (!email || !password) return { error: "Vui lòng nhập email và mật khẩu.", email };

  try {
    const supabase = await createAdminAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { error: FAILED_MESSAGE, email };

    // A valid Supabase account is not enough: it must have a team role (admin or nhan_vien).
    if (!roleFromAppMetadata(data.user.app_metadata)) {
      await supabase.auth.signOut({ scope: "local" });
      return { error: FAILED_MESSAGE, email };
    }
  } catch (err) {
    console.error("Admin login failed", (err as Error).message);
    return { error: "Không đăng nhập được lúc này. Vui lòng thử lại sau.", email };
  }

  redirect(next);
}
