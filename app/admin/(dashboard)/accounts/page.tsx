import { AccountRoleButton } from "@/components/admin/account-role-button";
import { AddAccountForm } from "@/components/admin/add-account-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLE_LABELS, listInternalAccounts } from "@/lib/admin-accounts";
import { canEdit, requireAdmin } from "@/lib/admin-auth";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// Live data from Supabase Auth: never prerender or cache this page.
export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  const admin = await requireAdmin("/admin/accounts");

  // Only Quản trị viên manage accounts. (The actions check again, and so does the data layer.)
  if (!canEdit(admin)) {
    return (
      <>
        <AdminPageHeader title="Tài khoản nội bộ" />
        <Card className="max-w-xl p-6">
          <p className="text-sm text-muted-foreground">
            Mục này chỉ dành cho Quản trị viên. Bạn đang đăng nhập với vai trò Nhân viên.
          </p>
        </Card>
      </>
    );
  }

  let accounts;
  try {
    accounts = await listInternalAccounts();
  } catch (err) {
    console.error("List accounts failed:", (err as Error).message);
    return (
      <>
        <AdminPageHeader title="Tài khoản nội bộ" />
        <p className="text-sm text-destructive">
          Không tải được danh sách tài khoản. Vui lòng thử lại sau.
        </p>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Tài khoản nội bộ"
        description="Các tài khoản có vai trò Quản trị viên hoặc Nhân viên. Quản trị viên xem, sửa, xóa dữ liệu và quản lý tài khoản; Nhân viên chỉ xem."
      />

      <div className="space-y-6">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tài khoản</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Đăng nhập bằng</TableHead>
                <TableHead>Tạo lúc</TableHead>
                <TableHead>Đăng nhập gần nhất</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Chưa có tài khoản nội bộ nào.
                  </TableCell>
                </TableRow>
              )}
              {accounts.map((a) => {
                const isSelf = a.id === admin.id;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.email}
                      {isSelf && (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                          Bạn
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          a.role === "admin"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {ROLE_LABELS[a.role]}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.provider === "email" ? (
                        "Email và mật khẩu"
                      ) : (
                        <span title="Tài khoản Google không có mật khẩu nên không đăng nhập được trang quản trị">
                          Google
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(a.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.lastSignInAt ? formatDateTime(a.lastSignInAt) : "Chưa đăng nhập"}
                    </TableCell>
                    <TableCell>
                      {isSelf ? (
                        <p className="text-right text-xs text-muted-foreground">
                          Không thể đổi vai trò của chính mình
                        </p>
                      ) : (
                        <AccountRoleButton id={a.id} role={a.role} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        <AddAccountForm />
      </div>
    </>
  );
}
