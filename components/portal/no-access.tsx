import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Shown to a signed-in user whose Google email has no approved quote request.
export function NoAccess({ email }: { email: string | null }) {
  return (
    <Card className="mx-auto max-w-lg p-8 text-center">
      <h1 className="text-2xl font-medium tracking-tight">Chưa có quyền truy cập</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Tài khoản Google{email ? <> <span className="text-foreground">{email}</span></> : ""} chưa
        có quyền vào cổng hồ sơ. Cổng hồ sơ dành cho khách có yêu cầu báo giá đã được duyệt.
      </p>
      <ul className="mt-4 space-y-1 text-left text-sm text-muted-foreground">
        <li>
          • Nếu bạn đã gửi yêu cầu báo giá, hãy đăng nhập bằng đúng email bạn đã dùng khi gửi và chờ
          đội ngũ duyệt.
        </li>
        <li>
          • Nếu chưa, hãy{" "}
          <Link href="/#bao-gia" className="text-primary underline-offset-4 hover:underline">
            gửi yêu cầu báo giá
          </Link>
          .
        </li>
      </ul>
      <form action="/auth/signout" method="post" className="mt-6 flex justify-center">
        <Button type="submit" variant="outline">
          <LogOut className="size-4" />
          Đăng xuất
        </Button>
      </form>
    </Card>
  );
}
