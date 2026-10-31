import { createAdminClient } from "@supabase/server/core";

// Internal (team) accounts: who can open the admin dashboard and with which role.
//
// An account is internal when its app_metadata.role is "admin" (Quản trị viên) or "nhan_vien"
// (Nhân viên). app_metadata can only be written with the secret key, so everything here runs
// on the server with the secret key. The callers (server actions) must first check that the
// person asking is a logged-in admin: the secret key itself bypasses all RLS.
//
// This file imports nothing from the app, so it can be tested on its own.

export type AdminRole = "admin" | "nhan_vien";

export const ROLE_LABELS: Record<AdminRole, string> = {
  admin: "Quản trị viên",
  nhan_vien: "Nhân viên",
};

export function isAdminRole(value: unknown): value is AdminRole {
  return value === "admin" || value === "nhan_vien";
}

export function roleFromAppMetadata(appMetadata: unknown): AdminRole | null {
  const role = (appMetadata as { role?: unknown } | null | undefined)?.role;
  return isAdminRole(role) ? role : null;
}

export type InternalAccount = {
  id: string;
  email: string;
  role: AdminRole;
  /** How the account signs in: "email" (email + password) or "google". */
  provider: string;
  createdAt: string;
  lastSignInAt: string | null;
};

export type AccountResult = { ok: true; message: string } | { ok: false; message: string };

const EMAIL_RE = /^[^@ ]+@[^@ ]+[.][^@ ]+$/;
const MIN_PASSWORD = 6; // Supabase's default minimum; no strength rules for now
const MAX_PASSWORD = 72; // bcrypt ignores anything longer

type AuthUser = {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string;
  app_metadata?: Record<string, unknown>;
};

/** The Auth admin API has no "filter by role": page through every account. */
async function listAllUsers(): Promise<AuthUser[]> {
  const db = createAdminClient();
  const all: AuthUser[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    all.push(...(data.users as AuthUser[]));
    if (data.users.length < 200) break;
  }
  return all;
}

export async function listInternalAccounts(): Promise<InternalAccount[]> {
  const users = await listAllUsers();
  const accounts: InternalAccount[] = [];
  for (const u of users) {
    const role = roleFromAppMetadata(u.app_metadata);
    if (!role) continue; // students and other accounts are not internal
    accounts.push({
      id: u.id,
      email: u.email ?? "",
      role,
      provider: String(u.app_metadata?.provider ?? "email"),
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
    });
  }
  // admins first, then by email
  return accounts.sort((a, b) =>
    a.role === b.role ? a.email.localeCompare(b.email) : a.role === "admin" ? -1 : 1,
  );
}

/**
 * Changes the role of an internal account.
 * Refused: changing your own role (it could lock you out), an account that is not internal,

 * and demoting the last remaining admin (the team must always keep one).
 * `listAccounts` is only a seam so the last-admin rule can be tested without touching real accounts.
 */
export async function changeAccountRole(
  actorId: string,
  targetId: string,
  role: AdminRole,
  listAccounts: () => Promise<InternalAccount[]> = listInternalAccounts,
): Promise<AccountResult> {
  if (!isAdminRole(role)) return { ok: false, message: "Vai trò không hợp lệ." };
  if (actorId === targetId) {
    return { ok: false, message: "Bạn không thể đổi vai trò của chính mình." };
  }

  const db = createAdminClient();
  const { data, error } = await db.auth.admin.getUserById(targetId);
  if (error || !data.user) return { ok: false, message: "Không tìm thấy tài khoản." };
  const target = data.user as AuthUser;

  const current = roleFromAppMetadata(target.app_metadata);
  if (!current) return { ok: false, message: "Đây không phải tài khoản nội bộ." };
  if (current === role) return { ok: true, message: "Vai trò không thay đổi." };

  if (current === "admin") {
    const admins = (await listAccounts()).filter((a) => a.role === "admin");
    if (admins.length <= 1) {
      return { ok: false, message: "Phải còn ít nhất một Quản trị viên." };
    }
  }

  const { error: updateError } = await db.auth.admin.updateUserById(targetId, {
    app_metadata: { ...target.app_metadata, role },
  });
  if (updateError) {
    console.error("Change role failed:", updateError.message);
    return { ok: false, message: "Không đổi được vai trò. Thử lại sau." };
  }
  return { ok: true, message: `Đã đổi ${target.email ?? "tài khoản"} thành ${ROLE_LABELS[role]}.` };
}

/**
 * Creates an internal account with an email and a password (already confirmed, so no email is
 * sent). Email + password sign-up is closed in the database except for emails listed in
 * admin_users, so the email is registered there first and the account is linked afterwards.
 * Never logs or returns the password.
 */
export async function createInternalAccount(input: {
  email: string;
  password: string;
  role: AdminRole;
}): Promise<AccountResult> {
  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { ok: false, message: "Email không hợp lệ." };
  }
  if (!isAdminRole(input.role)) return { ok: false, message: "Vai trò không hợp lệ." };
  if (password.length < MIN_PASSWORD) {
    return { ok: false, message: `Mật khẩu quá ngắn (tối thiểu ${MIN_PASSWORD} ký tự).` };
  }
  if (password.length > MAX_PASSWORD) {
    return { ok: false, message: `Mật khẩu quá dài (tối đa ${MAX_PASSWORD} ký tự).` };
  }

  const db = createAdminClient();

  const { error: allowError } = await db
    .from("admin_users")
    .upsert({ email }, { onConflict: "email" });
  if (allowError) {
    console.error("Register team email failed:", allowError.message);
    return { ok: false, message: "Không tạo được tài khoản. Thử lại sau." };
  }

  const created = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: input.role },
  });

  if (created.error || !created.data.user) {
    // Do not leave the email open for sign-up (only when no account is linked to it).
    await db.from("admin_users").delete().eq("email", email).is("user_id", null);
    const code = (created.error as { code?: string } | null)?.code;
    if (code === "email_exists") return { ok: false, message: "Email này đã có tài khoản." };
    if (code === "weak_password") return { ok: false, message: "Mật khẩu không được chấp nhận." };
    console.error("Create account failed:", created.error?.message);
    return { ok: false, message: "Không tạo được tài khoản. Thử lại sau." };
  }

  const { error: linkError } = await db
    .from("admin_users")
    .update({ user_id: created.data.user.id })
    .eq("email", email);
  if (linkError) {
    await db.auth.admin.deleteUser(created.data.user.id); // roll back: no half-created account
    await db.from("admin_users").delete().eq("email", email);
    console.error("Link account failed:", linkError.message);
    return { ok: false, message: "Không tạo được tài khoản. Thử lại sau." };
  }

  return { ok: true, message: `Đã tạo tài khoản ${email} (${ROLE_LABELS[input.role]}).` };
}
