"use server";

import { revalidatePath } from "next/cache";
import { canEdit, getAdminUser } from "@/lib/admin-auth";
import { changeAccountRole, createInternalAccount, isAdminRole } from "@/lib/admin-accounts";

export type AccountActionResult = {
  ok: boolean;
  message: string;
  /** Sent back after a failed attempt so the form can keep it (never the password). */
  email?: string;
};

const AUTH_ERROR: AccountActionResult = {
  ok: false,
  message: "Phiên đăng nhập quản trị đã hết hạn. Vui lòng đăng nhập lại.",
};
const NO_PERMISSION: AccountActionResult = {
  ok: false,
  message: "Chỉ Quản trị viên được quản lý tài khoản.",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Managing accounts is for Quản trị viên (admin) only. These actions use the secret key (the Auth
// admin API), which bypasses RLS, so the role is checked here, against the account itself.

export async function changeRoleAction(
  targetId: string,
  role: string,
): Promise<AccountActionResult> {
  const user = await getAdminUser();
  if (!user) return AUTH_ERROR;
  if (!canEdit(user)) return NO_PERMISSION;
  if (!UUID_RE.test(targetId) || !isAdminRole(role)) {
    return { ok: false, message: "Dữ liệu không hợp lệ." };
  }
  try {
    const result = await changeAccountRole(user.id, targetId, role);
    revalidatePath("/admin/accounts");
    return result;
  } catch (err) {
    console.error("Change role failed:", (err as Error).message);
    return { ok: false, message: "Không đổi được vai trò. Thử lại sau." };
  }
}

export async function createAccountAction(
  _previous: AccountActionResult | null,
  formData: FormData,
): Promise<AccountActionResult> {
  const user = await getAdminUser();
  if (!user) return AUTH_ERROR;
  if (!canEdit(user)) return NO_PERMISSION;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!isAdminRole(role)) return { ok: false, message: "Vui lòng chọn vai trò.", email };

  try {
    const result = await createInternalAccount({ email, password, role });
    if (result.ok) revalidatePath("/admin/accounts");
    return { ...result, email: result.ok ? undefined : email };
  } catch (err) {
    // The message only: the password is never logged.
    console.error("Create account failed:", (err as Error).message);
    return { ok: false, message: "Không tạo được tài khoản. Thử lại sau.", email };
  }
}
