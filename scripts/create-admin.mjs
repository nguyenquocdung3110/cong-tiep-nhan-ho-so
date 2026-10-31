// Creates (or resets) a dashboard account. There is no public sign-up: this is the only way to
// get an account. Every account has a role, stored in app_metadata.role:
//   nhan_vien  staff: can view everything, cannot edit or delete   (the default)
//   admin      can also edit and delete student profiles and conversations
//
//   npm run create-admin -- team@congty.vn                 new STAFF account (asks for a password)
//   npm run create-admin -- team@congty.vn --role admin    new ADMIN account
//   npm run create-admin -- team@congty.vn --reset         set a new password for an existing account
//
// To change the role of an existing account use: npm run set-role -- <email> <role>
//
// Run it on a machine that has the project's .env (it needs SUPABASE_SECRET_KEY).
// The password is typed at the prompt (hidden). For automation, set ADMIN_PASSWORD instead.

import readline from "node:readline";
import { createAdminClient } from "@supabase/server/core";

const args = process.argv.slice(2);
const reset = args.includes("--reset");
const roleIndex = args.findIndex((a) => a === "--role" || a.startsWith("--role="));
const roleArg =
  roleIndex < 0
    ? "nhan_vien"
    : args[roleIndex].includes("=")
      ? args[roleIndex].split("=")[1]
      : args[roleIndex + 1];
const email = (
  args.find((a, i) => !a.startsWith("--") && !(roleIndex >= 0 && i === roleIndex + 1 && args[roleIndex] === "--role")) ?? ""
)
  .trim()
  .toLowerCase();

if (!["admin", "nhan_vien"].includes(roleArg)) {
  console.error("Vai trò phải là admin hoặc nhan_vien.");
  process.exit(1);
}

if (!/^[^@ ]+@[^@ ]+[.][^@ ]+$/.test(email)) {
  console.error("Cách dùng: npm run create-admin -- email@congty.vn [--role admin|nhan_vien] [--reset]");
  process.exit(1);
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    rl._writeToOutput = (text) => rl.output.write(muted ? "*" : text);
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

async function getPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  const first = await askHidden("Mật khẩu: ");
  const second = await askHidden("Nhập lại mật khẩu: ");
  if (first !== second) {
    console.error("Hai lần nhập mật khẩu không khớp.");
    process.exit(1);
  }
  return first;
}

const db = createAdminClient();

const { data: existing, error: lookupError } = await db
  .from("admin_users")
  .select("email, user_id")
  .eq("email", email)
  .maybeSingle();
if (lookupError) {
  console.error("Không đọc được danh sách admin:", lookupError.message);
  process.exit(1);
}

if (reset) {
  if (!existing?.user_id) {
    console.error("Không có tài khoản admin nào với email này để đặt lại mật khẩu.");
    process.exit(1);
  }
  const password = await getPassword();
  const { error } = await db.auth.admin.updateUserById(existing.user_id, { password });
  if (error) {
    console.error("Không đặt lại được mật khẩu:", error.message);
    process.exit(1);
  }
  console.log(`Đã đặt lại mật khẩu cho ${email}.`);
  process.exit(0);
}

if (existing?.user_id) {
  console.error(`${email} đã có tài khoản. Dùng --reset để đặt mật khẩu mới, hoặc npm run set-role để đổi vai trò.`);
  process.exit(1);
}

const password = await getPassword();

// 1) Pre-register the email: the database only accepts email + password accounts for
//    emails listed here, which is what keeps sign-up closed to everybody else.
const { error: allowError } = await db.from("admin_users").upsert({ email }, { onConflict: "email" });
if (allowError) {
  console.error("Không đăng ký được email admin:", allowError.message);
  process.exit(1);
}

// 2) Create the account (already confirmed, so no email is sent).
const created = await db.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: { role: roleArg },
});
if (created.error || !created.data.user) {
  await db.from("admin_users").delete().eq("email", email).is("user_id", null); // do not leave the email open
  console.error("Không tạo được tài khoản:", created.error?.message ?? "lỗi không rõ");
  console.error("Nếu email này đã có tài khoản khác (ví dụ đăng nhập Google), hãy dùng một email khác cho admin.");
  process.exit(1);
}

// 3) Link the account to its admin row.
const { error: linkError } = await db
  .from("admin_users")
  .update({ user_id: created.data.user.id })
  .eq("email", email);
if (linkError) {
  await db.auth.admin.deleteUser(created.data.user.id);
  await db.from("admin_users").delete().eq("email", email);
  console.error("Không gắn được tài khoản vào danh sách admin:", linkError.message);
  process.exit(1);
}

console.log(`Đã tạo tài khoản ${email} với vai trò ${roleArg}. Đăng nhập tại /admin/login.`);
