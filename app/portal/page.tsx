import { cookies } from "next/headers";
import { LogOut } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { DocumentFeatures } from "@/components/portal/document-features";
import { ExtractedInfo } from "@/components/portal/extracted-info";
import { SchoolMatch } from "@/components/portal/school-match";
import { ScholarshipSuggestions } from "@/components/portal/scholarship-suggestions";
import { basisKey } from "@/lib/scholarship-advisor";
import { buildAdvisorInput } from "@/lib/scholarship-input";
import { gpaOnTenScale, matchSchools, SCHOOL_GPA_SCALE } from "@/lib/school-match";
import { listSchools, type School } from "@/lib/schools";
import { getProfile, isValidProfileId, type StudentProfile } from "@/lib/student-store";

// Personal, per-visitor data read from Supabase: never prerender or cache.
export const dynamic = "force-dynamic";

async function loadProfile(): Promise<{ profile: StudentProfile | null; failed: boolean }> {
  const id = (await cookies()).get("student_profile")?.value;
  if (!isValidProfileId(id)) return { profile: null, failed: false };
  try {
    return { profile: await getProfile(id), failed: false };
  } catch (err) {
    console.error("Load student profile failed", (err as Error).message);
    return { profile: null, failed: true };
  }
}

async function loadSchools(): Promise<School[] | null> {
  try {
    return await listSchools();
  } catch (err) {
    console.error("Load schools failed", (err as Error).message);
    return null;
  }
}

export default async function PortalPage() {
  const [{ profile, failed }, schools] = await Promise.all([loadProfile(), loadSchools()]);

  // Compare only once all 3 documents are submitted and valid.
  const notReady = [
    ...(profile?.transcript.status === "hop_le" ? [] : ["bảng điểm"]),
    ...(profile?.ielts.status === "hop_le" ? [] : ["chứng chỉ IELTS"]),
    ...(profile?.identity.status === "hop_le" ? [] : ["CMND/CCCD hoặc hộ chiếu"]),
  ];
  const gpa = profile?.transcript.data.gpa ?? null;
  const gpaScale = profile?.transcript.data.gpaScale ?? null;
  const ielts = profile?.ielts.data.overall ?? null;
  const ready = notReady.length === 0 && gpa !== null && ielts !== null;
  const matches = ready ? matchSchools(schools ?? [], { gpa, gpaScale, ielts }) : [];
  const gpaConverted =
    ready && gpaScale !== null && gpaScale !== SCHOOL_GPA_SCALE
      ? { gpa, scale: gpaScale, converted: gpaOnTenScale(gpa, gpaScale) }
      : null;

  // Scholarship suggestions are offered once the profile is complete and at least one school is eligible.
  const advisor = profile && schools ? buildAdvisorInput(profile, schools) : null;
  const saved = profile?.scholarships ?? null;
  const stale = !!saved && !!advisor?.input && saved.basis !== basisKey(advisor.input);

  const displayName =
    profile?.identity.data.fullName ??
    profile?.transcript.data.fullName ??
    profile?.ielts.data.fullName ??
    "bạn";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-32">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
          <div>
            <p className="text-sm text-muted-foreground">Xin chào,</p>
            <h1 className="text-2xl font-medium tracking-tight">{displayName}</h1>
          </div>
          <Button variant="outline">
            <LogOut className="size-4" />
            Đăng xuất
          </Button>
        </div>

        {failed && (
          <p className="mt-6 text-sm text-red-600">
            Không tải được hồ sơ của bạn lúc này. Vui lòng tải lại trang sau.
          </p>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-medium">Giấy tờ cần nộp</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Nộp đủ 3 loại giấy tờ dưới đây, hệ thống sẽ tự đọc và trích xuất thông tin giúp bạn.
          </p>

          <div className="mt-6">
            <DocumentFeatures
              items={[
                {
                  type: "transcript",
                  title: "Bảng điểm (PDF)",
                  accept: "Chấp nhận PDF, tối đa 4 MB",
                  acceptAttr: "application/pdf,.pdf",
                  fileName: profile?.transcript.fileName ?? null,
                  status: profile?.transcript.status ?? "chua_nop",
                  reason: profile?.transcript.reason ?? null,
                },
                {
                  type: "ielts",
                  title: "Ảnh chứng chỉ IELTS",
                  accept: "Chấp nhận JPG, PNG, tối đa 4 MB",
                  acceptAttr: "image/jpeg,image/png,.jpg,.jpeg,.png",
                  fileName: profile?.ielts.fileName ?? null,
                  status: profile?.ielts.status ?? "chua_nop",
                  reason: profile?.ielts.reason ?? null,
                },
                {
                  type: "identity",
                  title: "Ảnh CMND/CCCD hoặc hộ chiếu",
                  accept: "Chấp nhận JPG, PNG, tối đa 4 MB",
                  acceptAttr: "image/jpeg,image/png,.jpg,.jpeg,.png",
                  fileName: profile?.identity.fileName ?? null,
                  status: profile?.identity.status ?? "chua_nop",
                  reason: profile?.identity.reason ?? null,
                },
              ]}
            />
          </div>

          <Button size="lg" className="mt-6 w-full sm:w-auto">
            Nộp hồ sơ
          </Button>
        </section>

        <section className="mt-12 space-y-6">
          <ExtractedInfo profile={profile} />
          {schools ? (
            <SchoolMatch
              matches={matches}
              notReady={ready ? [] : notReady.length ? notReady : ["điểm số"]}
              gpaConverted={gpaConverted}
            />
          ) : (
            <p className="text-sm text-red-600">
              Không tải được danh sách điểm chuẩn lúc này, vui lòng tải lại trang sau.
            </p>
          )}
          {advisor?.input && (
            <ScholarshipSuggestions
              suggestions={saved?.suggestions ?? null}
              suggestedAt={saved?.suggestedAt ?? null}
              stale={stale}
            />
          )}
          {advisor?.reason === "no_eligible_school" && (
            <p className="text-sm text-muted-foreground">
              Chưa có trường nào bạn đạt yêu cầu nên chưa có học bổng để gợi ý.
            </p>
          )}
        </section>
      </main>
    </>
  );
}
