import { AdminSidebar, AdminMobileNav } from "@/components/admin/sidebar";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Nobody but a logged-in admin sees the dashboard (pages and actions check again themselves).
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <AdminSidebar email={admin.email} role={admin.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileNav role={admin.role} />
        <main className="flex-1 px-6 py-8 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}
