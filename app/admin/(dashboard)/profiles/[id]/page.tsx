import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DeleteProfileButton } from "@/components/admin/delete-profile-button";
import {
  ProfileDocumentCard,
  type FieldDef,
} from "@/components/admin/profile-document-card";
import { canEdit, requireAdmin } from "@/lib/admin-auth";
import { getProfileForAdmin } from "@/lib/admin-data";
import { isValidConversationId as isUuid } from "@/lib/chat-store";
import { formatDate, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const str = (v: string | null) => v ?? "";
const nstr = (v: number | null) => (v === null ? "" : String(v));
const score = (v: number | null) => (v === null ? null : v.toFixed(1));
const plain = (v: number | null) => (v === null ? null : String(v));

export default async function AdminProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await requireAdmin(`/admin/profiles/${encodeURIComponent(id)}`);
  const editable = canEdit(admin); // staff (nhan_vien) can only view
  if (!isUuid(id)) notFound();

  const found = await getProfileForAdmin(id);
  if (!found) notFound();
  const { profile: p, email, createdAt, updatedAt } = found;
  const t = p.transcript.data;
  const i = p.ielts.data;
  const d = p.identity.data;

  const transcriptFields: FieldDef[] = [
    { name: "transcript_name", label: "Họ tên", type: "text", value: str(t.fullName), display: t.fullName },
    { name: "transcript_dob", label: "Ngày sinh", type: "date", value: str(t.dateOfBirth), display: formatDate(t.dateOfBirth) },
    { name: "transcript_gpa", label: "Điểm học tập tổng kết", type: "number", value: nstr(t.gpa), display: plain(t.gpa), required: true },
    { name: "transcript_gpa_scale", label: "Thang điểm (ví dụ 10 hoặc 4)", type: "number", value: nstr(t.gpaScale), display: plain(t.gpaScale) },
  ];
  const ieltsFields: FieldDef[] = [
    { name: "ielts_name", label: "Họ tên trên chứng chỉ", type: "text", value: str(i.fullName), display: i.fullName },
    { name: "ielts_exam_date", label: "Ngày thi", type: "date", value: str(i.examDate), display: formatDate(i.examDate) },
    { name: "ielts_listening", label: "Nghe (Listening)", type: "number", value: nstr(i.listening), display: score(i.listening) },
    { name: "ielts_reading", label: "Đọc (Reading)", type: "number", value: nstr(i.reading), display: score(i.reading) },
    { name: "ielts_writing", label: "Viết (Writing)", type: "number", value: nstr(i.writing), display: score(i.writing) },
    { name: "ielts_speaking", label: "Nói (Speaking)", type: "number", value: nstr(i.speaking), display: score(i.speaking) },
    { name: "ielts_overall", label: "Điểm tổng (Overall)", type: "number", value: nstr(i.overall), display: score(i.overall), required: true },
  ];
  const identityFields: FieldDef[] = [
    { name: "identity_name", label: "Họ tên", type: "text", value: str(d.fullName), display: d.fullName },
    { name: "identity_dob", label: "Ngày sinh", type: "date", value: str(d.dateOfBirth), display: formatDate(d.dateOfBirth) },
    { name: "identity_number", label: "Số giấy tờ", type: "text", value: str(d.documentNumber), display: d.documentNumber, required: true },
  ];

  const name = d.fullName ?? t.fullName ?? i.fullName ?? "Chưa có tên";

  return (
    <>
      <Link
        href="/admin/profiles"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Tất cả hồ sơ
      </Link>

      <AdminPageHeader
        title={name}
        description={`${email ?? "Không rõ email"} · tạo ${formatDateTime(createdAt)} · cập nhật ${formatDateTime(updatedAt)}`}
        action={editable ? <DeleteProfileButton id={p.id} /> : undefined}
      />

      {!editable && (
        <p className="mb-4 text-sm text-muted-foreground">
          Bạn đang đăng nhập với vai trò nhân viên: chỉ được xem hồ sơ, không sửa hay xóa.
        </p>
      )}

      <div className="max-w-3xl space-y-4">
        <ProfileDocumentCard
          profileId={p.id}
          docType="transcript"
          title="Bảng điểm"
          status={p.transcript.status}
          fileName={p.transcript.fileName}
          reason={p.transcript.reason}
          fields={transcriptFields}
          canEdit={editable}
        />
        <ProfileDocumentCard
          profileId={p.id}
          docType="ielts"
          title="Chứng chỉ IELTS"
          status={p.ielts.status}
          fileName={p.ielts.fileName}
          reason={p.ielts.reason}
          fields={ieltsFields}
          canEdit={editable}
        />
        <ProfileDocumentCard
          profileId={p.id}
          docType="identity"
          title="CMND/CCCD hoặc hộ chiếu"
          status={p.identity.status}
          fileName={p.identity.fileName}
          reason={p.identity.reason}
          fields={identityFields}
          canEdit={editable}
        />
      </div>
    </>
  );
}
