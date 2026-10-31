import { requireAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";

export default async function AdminIndexPage() {
  await requireAdmin("/admin");
  redirect("/admin/requests");
}
