// Sets app_metadata.role on a Supabase Auth account, using the secret key from .env.
//
//   npm run set-role -- <email> <role>      e.g.  npm run set-role -- team@congty.vn admin
//
// app_metadata can only be changed with the secret key (users cannot edit it themselves), so a
// role stored there is trustworthy. It travels inside the account's access token, which is
// refreshed about hourly: the new role shows up after the account's next token refresh or login.
//
// What the roles mean (enforced in the app AND by the database's RLS policies):
//   admin      can open the admin dashboard, view everything, edit and delete student profiles
//              and conversations
//   nhan_vien  can open the dashboard and only VIEW; cannot edit or delete
//   no role    cannot open the dashboard (for example a student who logged in with Google)
//
// The app picks up a new or changed role on the account's next dashboard request (it refreshes
// the session by itself).

import { createAdminClient } from "@supabase/server/core";

const ROLES = ["admin", "nhan_vien"];

const email = (process.argv[2] ?? "").trim().toLowerCase();
const role = (process.argv[3] ?? "").trim();

if (!/^[^@ ]+@[^@ ]+[.][^@ ]+$/.test(email) || !ROLES.includes(role)) {
  console.error(`Cách dùng: npm run set-role -- <email> <${ROLES.join("|")}>`);
  process.exit(1);
}

const db = createAdminClient();

// The Auth admin API has no "get user by email": page through the accounts and match.
async function findUserByEmail(target) {
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
}

const user = await findUserByEmail(email);
if (!user) {
  console.error(`Không tìm thấy tài khoản với email ${email}.`);
  process.exit(1);
}

// Keep the other app_metadata keys (provider, providers, ...) and only set "role".
const before = user.app_metadata?.role ?? null;
const { data, error } = await db.auth.admin.updateUserById(user.id, {
  app_metadata: { ...user.app_metadata, role },
});
if (error) {
  console.error("Không gán được role:", error.message);
  process.exit(1);
}

console.log(`${email}: role ${before ?? "(chưa có)"} -> ${data.user.app_metadata.role}`);
