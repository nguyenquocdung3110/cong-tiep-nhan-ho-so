import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
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
import { listSchools, type School } from "@/lib/schools";

// Live data from Supabase: never prerender or cache this page.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Điểm chuẩn trường — DuHoc24",
};

export default async function SchoolsPage() {
  let schools: School[] | null = null;
  try {
    schools = await listSchools();
  } catch (err) {
    console.error("Load schools failed", (err as Error).message);
  }

  const byCountry = new Map<string, School[]>();
  for (const school of schools ?? []) {
    byCountry.set(school.country, [...(byCountry.get(school.country) ?? []), school]);
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-32">
        <h1 className="text-3xl font-medium tracking-tight">Điểm chuẩn trường</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Điểm học tập và IELTS tối thiểu của từng trường. Điểm học tập tính theo thang 10.
          Nộp giấy tờ trong cổng hồ sơ để hệ thống tự đối chiếu và báo trường nào bạn đủ điều kiện.
        </p>
        <Button className="mt-6" render={<Link href="/portal">Vào cổng hồ sơ</Link>} />

        {schools === null && (
          <p className="mt-10 text-sm text-red-600">
            Không tải được danh sách trường lúc này, vui lòng tải lại trang sau.
          </p>
        )}
        {schools !== null && schools.length === 0 && (
          <p className="mt-10 text-sm text-muted-foreground">Chưa có trường nào.</p>
        )}

        <div className="mt-10 space-y-10">
          {[...byCountry.entries()].map(([country, list]) => (
            <section key={country}>
              <h2 className="mb-3 text-lg font-medium">{country}</h2>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên trường</TableHead>
                      <TableHead>Điểm học tập tối thiểu</TableHead>
                      <TableHead>Điểm IELTS tối thiểu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((school) => (
                      <TableRow key={school.id}>
                        <TableCell className="font-medium">{school.name}</TableCell>
                        <TableCell>{school.minGpa.toFixed(1)}</TableCell>
                        <TableCell>{school.minIelts.toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
