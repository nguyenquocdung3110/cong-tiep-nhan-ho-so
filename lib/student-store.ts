import { createAdminClient } from "@supabase/server/core";
import type { ScholarshipSuggestions } from "@/lib/scholarship-advisor";

// Server-only. student_profiles holds private personal data (dates of birth, ID
// numbers). RLS is on with no policies, so only the secret key used here can access it.

export type DocType = "transcript" | "ielts" | "identity";
export type DocStatus = "chua_nop" | "dang_xu_ly" | "hop_le" | "can_nop_lai";

export type TranscriptData = {
  fullName: string | null;
  dateOfBirth: string | null; // ISO yyyy-mm-dd
  gpa: number | null;
  gpaScale: number | null;
};

export type IeltsData = {
  fullName: string | null;
  listening: number | null;
  reading: number | null;
  writing: number | null;
  speaking: number | null;
  overall: number | null;
  examDate: string | null; // ISO yyyy-mm-dd
};

export type IdentityData = {
  fullName: string | null;
  dateOfBirth: string | null; // ISO yyyy-mm-dd
  documentNumber: string | null;
};

export type DocState<T> = {
  status: DocStatus;
  fileName: string | null;
  reason: string | null;
  data: T;
};

export type StudentProfile = {
  id: string;
  transcript: DocState<TranscriptData>;
  ielts: DocState<IeltsData>;
  identity: DocState<IdentityData>;
  scholarships: {
    suggestions: ScholarshipSuggestions;
    /** Fingerprint of the inputs the suggestions were made from. */
    basis: string;
    suggestedAt: string;
  } | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidProfileId(id: string | undefined): id is string {
  return !!id && UUID_RE.test(id);
}

export async function createProfile(): Promise<string> {
  const { data, error } = await createAdminClient()
    .from("student_profiles")
    .insert({})
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function profileExists(id: string): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("student_profiles")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function getProfile(id: string): Promise<StudentProfile | null> {
  const { data: r, error } = await createAdminClient()
    .from("student_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!r) return null;
  return {
    id: r.id,
    transcript: {
      status: r.transcript_status,
      fileName: r.transcript_file_name,
      reason: r.transcript_reason,
      data: {
        fullName: r.transcript_full_name,
        dateOfBirth: r.transcript_date_of_birth,
        gpa: num(r.transcript_gpa),
        gpaScale: num(r.transcript_gpa_scale),
      },
    },
    ielts: {
      status: r.ielts_status,
      fileName: r.ielts_file_name,
      reason: r.ielts_reason,
      data: {
        fullName: r.ielts_full_name,
        listening: num(r.ielts_listening),
        reading: num(r.ielts_reading),
        writing: num(r.ielts_writing),
        speaking: num(r.ielts_speaking),
        overall: num(r.ielts_overall),
        examDate: r.ielts_exam_date,
      },
    },
    scholarships: r.scholarship_suggestions
      ? {
          suggestions: r.scholarship_suggestions as ScholarshipSuggestions,
          basis: r.scholarship_basis ?? "",
          suggestedAt: r.scholarship_suggested_at,
        }
      : null,
    identity: {
      status: r.identity_status,
      fileName: r.identity_file_name,
      reason: r.identity_reason,
      data: {
        fullName: r.identity_full_name,
        dateOfBirth: r.identity_date_of_birth,
        documentNumber: r.identity_document_number,
      },
    },
  };
}

type Columns = Record<string, string | number | null>;

function columnsFor(
  type: DocType,
  status: DocStatus,
  fileName: string,
  reason: string | null,
  data: TranscriptData | IeltsData | IdentityData | null,
): Columns {
  const base: Columns = {
    [`${type}_status`]: status,
    [`${type}_file_name`]: fileName,
    [`${type}_reason`]: reason,
  };
  // data === null clears every extracted field of this document type.
  if (type === "transcript") {
    const d = data as TranscriptData | null;
    return {
      ...base,
      transcript_full_name: d?.fullName ?? null,
      transcript_date_of_birth: d?.dateOfBirth ?? null,
      transcript_gpa: d?.gpa ?? null,
      transcript_gpa_scale: d?.gpaScale ?? null,
    };
  }
  if (type === "ielts") {
    const d = data as IeltsData | null;
    return {
      ...base,
      ielts_full_name: d?.fullName ?? null,
      ielts_listening: d?.listening ?? null,
      ielts_reading: d?.reading ?? null,
      ielts_writing: d?.writing ?? null,
      ielts_speaking: d?.speaking ?? null,
      ielts_overall: d?.overall ?? null,
      ielts_exam_date: d?.examDate ?? null,
    };
  }
  const d = data as IdentityData | null;
  return {
    ...base,
    identity_full_name: d?.fullName ?? null,
    identity_date_of_birth: d?.dateOfBirth ?? null,
    identity_document_number: d?.documentNumber ?? null,
  };
}

export async function saveDocument(
  profileId: string,
  type: DocType,
  result:
    | { ok: true; data: TranscriptData | IeltsData | IdentityData }
    | { ok: false; reason: string },
  fileName: string,
) {
  const cols = result.ok
    ? columnsFor(type, "hop_le", fileName, null, result.data)
    : columnsFor(type, "can_nop_lai", fileName, result.reason, null);
  const { error } = await createAdminClient()
    .from("student_profiles")
    .update({ ...cols, updated_at: new Date().toISOString() })
    .eq("id", profileId);
  if (error) throw error;
}

export async function saveScholarshipSuggestions(
  profileId: string,
  suggestions: ScholarshipSuggestions,
  basis: string,
) {
  const { error } = await createAdminClient()
    .from("student_profiles")
    .update({
      scholarship_suggestions: suggestions,
      scholarship_basis: basis,
      scholarship_suggested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);
  if (error) throw error;
}
