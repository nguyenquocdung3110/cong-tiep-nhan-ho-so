import { requireAdmin } from "@/lib/admin-auth";
import { AdminPageHeader } from "@/components/admin/page-header";
import { RequestActions } from "@/components/admin/request-actions";
import { Card } from "@/components/ui/card";
import { RequestStatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { DEGREE_LEVELS, formatVnd, PACKAGE_NAMES, type ServicePackage } from "@/lib/quote";
import { listQuoteRequests } from "@/lib/quote-store";

// Live data from Supabase: never prerender or cache this page.
export const dynamic = "force-dynamic";

const degreeLabel = (v: string) => DEGREE_LEVELS.find((d) => d.value === v)?.label ?? v;
const packageLabel = (v: string) => PACKAGE_NAMES[v as ServicePackage] ?? v;

export default async function AdminRequestsPage() {
  await requireAdmin("/admin/requests");
  let requests;
  try {
    requests = await listQuoteRequests();
  } catch (err) {
    console.error("Load quote requests failed", (err as Error).message);
    return (
      <>
        <AdminPageHeader title="Yêu cầu" />
        <p className="text-sm text-destructive">
          Không tải được danh sách yêu cầu. Kiểm tra SUPABASE_URL và SUPABASE_SECRET_KEY trong .env.
        </p>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Yêu cầu"
        description="Danh sách yêu cầu báo giá gửi từ trang chủ, chờ đội ngũ duyệt. Khi duyệt, khách sẽ nhận link đăng nhập qua email."
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Khách</TableHead>
              <TableHead>Gói dịch vụ</TableHead>
              <TableHead>Báo giá</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Chưa có yêu cầu báo giá nào.
                </TableCell>
              </TableRow>
            )}
            {requests.map((req) => (
              <TableRow key={req.id}>
                <TableCell>
                  <p className="font-medium">{req.customerName}</p>
                  <p className="text-xs text-muted-foreground">{req.email}</p>
                </TableCell>
                <TableCell>
                  <p>{packageLabel(req.servicePackage)}</p>
                  <p className="text-xs text-muted-foreground">
                    {req.studyCountry} · {degreeLabel(req.degreeLevel)}
                  </p>
                </TableCell>
                <TableCell>{formatVnd(req.price)}</TableCell>
                <TableCell>
                  <RequestStatusBadge status={req.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(req.createdAt)}
                </TableCell>
                <TableCell>
                  <RequestActions
                    id={req.id}
                    status={req.status}
                    notified={!!req.approvalNotifiedAt}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
