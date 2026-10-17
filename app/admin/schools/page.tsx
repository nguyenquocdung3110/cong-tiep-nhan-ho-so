import { Pencil, Plus, Trash2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listSchools } from "@/lib/schools";

// Live data from Supabase: never prerender or cache this page.
export const dynamic = "force-dynamic";

export default async function AdminSchoolsPage() {
  let schools;
  try {
    schools = await listSchools();
  } catch (err) {
    console.error("Load schools failed", err);
    return (
      <>
        <AdminPageHeader title="Trường tham chiếu" />
        <p className="text-sm text-destructive">
          Không tải được danh sách trường. Kiểm tra SUPABASE_URL và SUPABASE_PUBLISHABLE_KEY trong .env.
        </p>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Trường tham chiếu"
        description="Điểm chuẩn dùng để đối chiếu hồ sơ học viên."
        action={
          <Button>
            <Plus className="size-4" />
            Thêm trường mới
          </Button>
        }
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên trường</TableHead>
              <TableHead>Quốc gia</TableHead>
              <TableHead>Điểm học tập tối thiểu</TableHead>
              <TableHead>Điểm IELTS tối thiểu</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schools.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Chưa có trường nào.
                </TableCell>
              </TableRow>
            )}
            {schools.map((school) => (
              <TableRow key={school.id}>
                <TableCell className="font-medium">{school.name}</TableCell>
                <TableCell>{school.country}</TableCell>
                <TableCell>{school.minGpa.toFixed(1)}</TableCell>
                <TableCell>{school.minIelts.toFixed(1)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button size="icon-sm" variant="outline" aria-label="Sửa">
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button size="icon-sm" variant="outline" aria-label="Xoá">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
