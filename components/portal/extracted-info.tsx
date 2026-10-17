import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StudentProfile } from "@/lib/student-store";
import { formatDate } from "@/lib/format";

type Field = { label: string; value: string | null };

const score = (v: number | null) => (v === null ? null : v.toFixed(1));

function Group({
  title,
  fields,
  emptyText,
}: {
  title: string;
  fields: Field[] | null;
  emptyText: string;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-foreground">{title}</h3>
      {fields ? (
        <dl className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.label} className="rounded-lg bg-muted/40 p-3">
              <dt className="text-xs text-muted-foreground">{field.label}</dt>
              <dd className="mt-1 break-words text-base font-medium">
                {field.value ?? <span className="text-sm font-normal text-muted-foreground">Chưa đọc được</span>}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}

export function ExtractedInfo({ profile }: { profile: StudentProfile | null }) {
  const t = profile?.transcript;
  const i = profile?.ielts;
  const d = profile?.identity;

  const transcriptFields: Field[] | null =
    t?.status === "hop_le"
      ? [
          { label: "Họ tên", value: t.data.fullName },
          { label: "Ngày sinh", value: formatDate(t.data.dateOfBirth) },
          {
            label: "Điểm học tập tổng kết",
            value:
              t.data.gpa === null
                ? null
                : `${t.data.gpa}${t.data.gpaScale ? ` / ${t.data.gpaScale}` : ""}`,
          },
        ]
      : null;

  const ieltsFields: Field[] | null =
    i?.status === "hop_le"
      ? [
          { label: "Họ tên trên chứng chỉ", value: i.data.fullName },
          { label: "Ngày thi", value: formatDate(i.data.examDate) },
          { label: "Nghe (Listening)", value: score(i.data.listening) },
          { label: "Đọc (Reading)", value: score(i.data.reading) },
          { label: "Viết (Writing)", value: score(i.data.writing) },
          { label: "Nói (Speaking)", value: score(i.data.speaking) },
          { label: "Điểm tổng (Overall)", value: score(i.data.overall) },
        ]
      : null;

  const identityFields: Field[] | null =
    d?.status === "hop_le"
      ? [
          { label: "Họ tên", value: d.data.fullName },
          { label: "Ngày sinh", value: formatDate(d.data.dateOfBirth) },
          { label: "Số giấy tờ", value: d.data.documentNumber },
        ]
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin đã trích xuất</CardTitle>
        <p className="text-sm text-muted-foreground">
          Đây là thông tin hệ thống đọc được từ giấy tờ bạn đã nộp, kiểm tra lại xem có đúng không nhé.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Group
          title="Bảng điểm"
          fields={transcriptFields}
          emptyText="Chưa có thông tin. Nộp bảng điểm (PDF) ở phía trên."
        />
        <Group
          title="Chứng chỉ IELTS"
          fields={ieltsFields}
          emptyText="Chưa có thông tin. Nộp ảnh chứng chỉ IELTS ở phía trên."
        />
        <Group
          title="CMND/CCCD hoặc hộ chiếu"
          fields={identityFields}
          emptyText="Chưa có thông tin. Nộp ảnh CMND/CCCD hoặc hộ chiếu ở phía trên."
        />
      </CardContent>
    </Card>
  );
}
