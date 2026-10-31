import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser, safeNextPath } from "@/lib/auth";

export const metadata = {
  title: "Đăng nhập — DuHoc24",
};

// The session decides what this page shows: never prerender or cache it.
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  cancelled: "Bạn đã hủy đăng nhập. Hãy thử lại khi sẵn sàng.",
  failed: "Không đăng nhập được. Vui lòng thử lại.",
  unavailable: "Đăng nhập bằng Google hiện chưa sẵn sàng. Vui lòng thử lại sau.",
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="size-5">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const nextPath = safeNextPath(next);

  // Already signed in: go straight to the portal.
  if (await getCurrentUser()) redirect(nextPath);

  const message = error ? (ERRORS[error] ?? ERRORS.failed) : null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 pb-24 pt-32">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-medium tracking-tight">Đăng nhập</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Dùng tài khoản Google của bạn để vào cổng hồ sơ. Không cần nhập mật khẩu.
          </p>

          {message && (
            <p
              role="alert"
              className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {message}
            </p>
          )}

          <form action="/auth/google" method="post" className="mt-6">
            <input type="hidden" name="next" value={nextPath} />
            <Button type="submit" size="lg" variant="outline" className="w-full">
              <GoogleIcon />
              Đăng nhập bằng Google
            </Button>
          </form>

          <p className="mt-6 text-xs text-muted-foreground">
            Khi đăng nhập, bạn đồng ý với{" "}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
              Chính sách quyền riêng tư
            </Link>
            .
          </p>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
