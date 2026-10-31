import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";
import { getAdminUser, safeAdminNext } from "@/lib/admin-auth";

export const metadata = {
  title: "Đăng nhập quản trị — DuHoc24",
};

// The session decides what this page shows: never prerender or cache it.
export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeAdminNext((await searchParams).next);

  // Already signed in as an admin: go straight to the dashboard.
  if (await getAdminUser()) redirect(next);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Link href="/" aria-label="Về trang chủ">
        <Logo uniColor />
      </Link>
      <Card className="mt-8 w-full max-w-sm p-8">
        <h1 className="text-center text-2xl font-medium tracking-tight">Đăng nhập quản trị</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Dành cho đội ngũ quản trị DuHoc24.
        </p>
        <AdminLoginForm next={next} />
      </Card>
      <Link href="/" className="mt-6 text-sm text-muted-foreground hover:text-primary">
        ← Về trang chủ
      </Link>
    </main>
  );
}
