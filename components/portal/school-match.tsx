import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Criterion, SchoolMatch as Match } from "@/lib/school-match";

// 8.2 -> "8.2", 7 -> "7.0", 8.75 -> "8.75"
const fmt = (n: number) => n.toFixed(2).replace(/0$/, "");

function Requirement({ label, c }: { label: string; c: Criterion }) {
  return (
    <p className="flex items-center justify-end gap-1.5">
      <span className={c.passed ? "text-green-700" : "text-red-600"}>
        {c.passed ? "✓" : "✗"}
      </span>
      <span>
        {label} {fmt(c.actual)} {c.passed ? "≥" : "<"} {fmt(c.required)}
      </span>
    </p>
  );
}

export function SchoolMatch({
  matches,
  notReady,
  gpaConverted,
}: {
  matches: Match[];
  /** Documents that are not yet submitted or not valid; comparison is shown only when empty. */
  notReady: string[];
  /** Set when the transcript GPA was converted from another scale to the 10-point scale. */
  gpaConverted: { gpa: number; scale: number; converted: number } | null;
}) {
  const eligibleCount = matches.filter((m) => m.eligible).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đối chiếu điểm chuẩn</CardTitle>
        {notReady.length > 0 ? (
          <p className="text-sm text-amber-700">
            Hệ thống sẽ tự đối chiếu khi cả 3 giấy tờ đã nộp và hợp lệ. Còn thiếu hoặc cần nộp lại:{" "}
            {notReady.join(", ")}.
          </p>
        ) : (
          <>
            <p className="text-sm font-medium">
              Bạn đủ điều kiện {eligibleCount}/{matches.length} trường.
            </p>
            <p className="text-sm text-muted-foreground">
              Trường được tính là đạt khi điểm học tập (thang 10) của bạn và điểm tổng IELTS
              (Overall) đều lớn hơn hoặc bằng điểm chuẩn của trường. Kết quả là phép so sánh số
              trực tiếp, không do AI quyết định.
            </p>
            {gpaConverted && (
              <p className="text-sm text-muted-foreground">
                Bảng điểm của bạn dùng thang {gpaConverted.scale} ({gpaConverted.gpa}/
                {gpaConverted.scale}), hệ thống quy đổi tuyến tính sang thang 10 được{" "}
                {gpaConverted.converted}.
              </p>
            )}
          </>
        )}
      </CardHeader>
      {notReady.length === 0 && (
        <CardContent className="space-y-3">
          {matches.length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có trường nào để đối chiếu.</p>
          )}
          {matches.map(({ school, gpa, ielts, eligible }) => (
            <div
              key={school.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4",
                eligible ? "border-green-200 bg-green-50" : "border-border bg-muted/30",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    eligible ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500",
                  )}
                >
                  {eligible ? <Check className="size-4" /> : <X className="size-4" />}
                </span>
                <div>
                  <p className="font-medium">{school.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {school.country} ·{" "}
                    <span className={eligible ? "text-green-700" : "text-gray-600"}>
                      {eligible ? "Đạt" : "Chưa đạt"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <Requirement label="GPA" c={gpa} />
                <Requirement label="IELTS" c={ielts} />
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
