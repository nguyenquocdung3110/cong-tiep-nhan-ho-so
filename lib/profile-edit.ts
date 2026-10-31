import type { IdentityData, IeltsData, TranscriptData } from "@/lib/student-store";

// Reads and validates the "edit student profile" form. The data is checked here on the server
// (the form's own checks are only a convenience).

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

const fail = <T>(error: string): Parsed<T> => ({ ok: false, error });

function text(form: FormData, key: string, max = 200): string | null {
  const v = String(form.get(key) ?? "").trim().replace(/\s+/g, " ").slice(0, max);
  return v === "" ? null : v;
}

/** Empty -> null; otherwise a real calendar date as yyyy-mm-dd, or "invalid". */
function date(form: FormData, key: string): string | null | "invalid" {
  const v = String(form.get(key) ?? "").trim();
  if (v === "") return null;
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v)) return "invalid";
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return "invalid";
  const year = d.getUTCFullYear();
  return year >= 1900 && year <= new Date().getUTCFullYear() + 1 ? v : "invalid";
}

/** Empty -> null; otherwise a finite number, or "invalid". */
function number(form: FormData, key: string): number | null | "invalid" {
  const v = String(form.get(key) ?? "").trim().replace(",", ".");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : "invalid";
}

/** IELTS band: 0 to 9 in steps of 0.5. */
function band(form: FormData, key: string): number | null | "invalid" {
  const n = number(form, key);
  if (n === null || n === "invalid") return n;
  return n >= 0 && n <= 9 && (n * 2) % 1 === 0 ? n : "invalid";
}

export function parseTranscript(form: FormData): Parsed<TranscriptData> {
  const dob = date(form, "transcript_dob");
  if (dob === "invalid") return fail("Ngày sinh trên bảng điểm không hợp lệ.");
  const gpa = number(form, "transcript_gpa");
  const scale = number(form, "transcript_gpa_scale");
  if (gpa === "invalid" || gpa === null || gpa < 0) return fail("Điểm học tập tổng kết không hợp lệ.");
  if (scale === "invalid" || (scale !== null && (scale <= 0 || scale > 100))) {
    return fail("Thang điểm không hợp lệ.");
  }
  if (gpa > (scale ?? 10)) return fail("Điểm học tập không được lớn hơn thang điểm.");
  return {
    ok: true,
    data: { fullName: text(form, "transcript_name"), dateOfBirth: dob, gpa, gpaScale: scale },
  };
}

export function parseIelts(form: FormData): Parsed<IeltsData> {
  const examDate = date(form, "ielts_exam_date");
  if (examDate === "invalid") return fail("Ngày thi IELTS không hợp lệ.");
  const skills = {
    listening: band(form, "ielts_listening"),
    reading: band(form, "ielts_reading"),
    writing: band(form, "ielts_writing"),
    speaking: band(form, "ielts_speaking"),
  };
  for (const v of Object.values(skills)) {
    if (v === "invalid") return fail("Điểm kỹ năng IELTS phải từ 0 đến 9, bước 0.5.");
  }
  const overall = band(form, "ielts_overall");
  if (overall === "invalid" || overall === null) {
    return fail("Điểm tổng IELTS (Overall) phải từ 0 đến 9, bước 0.5.");
  }
  return {
    ok: true,
    data: {
      fullName: text(form, "ielts_name"),
      listening: skills.listening as number | null,
      reading: skills.reading as number | null,
      writing: skills.writing as number | null,
      speaking: skills.speaking as number | null,
      overall,
      examDate,
    },
  };
}

export function parseIdentity(form: FormData): Parsed<IdentityData> {
  const dob = date(form, "identity_dob");
  if (dob === "invalid") return fail("Ngày sinh trên giấy tờ không hợp lệ.");
  const documentNumber = text(form, "identity_number", 50)?.replace(/\s/g, "") ?? null;
  if (!documentNumber) return fail("Số giấy tờ không được để trống.");
  return {
    ok: true,
    data: { fullName: text(form, "identity_name"), dateOfBirth: dob, documentNumber },
  };
}
