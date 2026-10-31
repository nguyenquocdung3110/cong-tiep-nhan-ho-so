import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { StatusDot, docStatusMeta } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin-auth";
import { listProfiles } from "@/lib/admin-data";
import { formatDateTime } from "@/lib/format";

// Live data from Supabase: never prerender or cache this page.
export const dynamic = "force-dynamic";

const DOCS = [
  { key: "transcriptStatus", label: "Bảng điểm" },
  { key: "ieltsStatus", label: "IELTS" },
  { key: "identityStatus", label: "CMND/Hộ chiếu" },
] as const;

export default async function AdminProfilesPage() {
  await requireAdmin("/admin/profiles");

  let profiles;
  try {
    profiles = await listProfiles();
  } catch (err) {
    console.error("Load profiles failed", (err as Error).message);
    return (
      <>
        <AdminPageHeader title="Hồ sơ học viên" />
        <p className="text-sm text-destructive">Không tải được danh sách hồ sơ. Vui lòng thử lại sau.</p>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Hồ sơ học viên"
        description="Hồ sơ của học viên đã đăng nhập cổng hồ sơ và nộp giấy tờ."
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Học viên</TableHead>
              <TableHead>Trạng thái 3 giấy tờ</TableHead>
              <TableHead>Cập nhật gần nhất</TableHead>
              <TableHead className="text-right">Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Chưa có hồ sơ nào.
                </TableCell>
              </TableRow>
            )}
            {profiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <p className="font-medium">{p.displayName ?? "Chưa có tên"}</p>
                  <p className="text-xs text-muted-foreground">{p.email ?? "Không rõ email"}</p>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {DOCS.map(({ key, label }) => (
                      <span
                        key={key}
                        title={`${label}: ${docStatusMeta[p[key]].label}`}
                        className="flex items-center gap-1.5"
                      >
                        <StatusDot tone={docStatusMeta[p[key]].tone} />
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(p.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/admin/profiles/${p.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Xem
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
