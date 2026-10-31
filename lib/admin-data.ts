import { createAdminAuthClient } from "@/lib/admin-auth";
import type {
  ConversationMessage,
  ConversationSummary,
  Lead,
  LeadQuality,
  StoredLead,
  StoredMessage,
} from "@/lib/chat-store";

// Data access for the admin dashboard. Everything here runs with the LOGGED-IN TEAM MEMBER'S OWN
// session (not the secret key), so the database's RLS policies decide what each role can do:
// admin = read + edit + delete, nhan_vien (staff) = read only. A bug in the app code cannot
// give staff more than the database allows.

// leads is one-to-one with conversations, so PostgREST returns an object or null
// (an array if the relationship is ever detected as one-to-many).
function pickLeadQuality(lead: unknown): LeadQuality | null {
  const row = Array.isArray(lead) ? lead[0] : lead;
  const q = (row as { quality?: string } | null | undefined)?.quality;
  return q === "good" || q === "ok" || q === "spam" ? q : null;
}

/** Latest conversations first, with message count and the opening message. */
export async function listConversations(
  limit = 100,
): Promise<ConversationSummary[]> {
  const { data, error } = await (await createAdminAuthClient())
    .from("conversations")
    .select(
      "id, created_at, updated_at, message_count:messages(count), first_message:messages(content), lead:leads(quality)",
    )
    .order("updated_at", { ascending: false })
    .order("created_at", { referencedTable: "first_message", ascending: true })
    .order("id", { referencedTable: "first_message", ascending: true })
    .limit(1, { referencedTable: "first_message" })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id as string,
    createdAt: c.created_at as string,
    updatedAt: c.updated_at as string,
    messageCount: (c.message_count as { count: number }[])[0]?.count ?? 0,
    preview: (c.first_message as { content: string }[])[0]?.content ?? "",
    leadQuality: pickLeadQuality(c.lead),
  }));
}

export async function getConversation(id: string): Promise<{
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
} | null> {
  const supabase = await createAdminAuthClient();
  const { data: conv, error } = await supabase
    .from("conversations")
    .select("id, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!conv) return null;

  const { data: rows, error: msgError } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (msgError) throw msgError;

  return {
    id: conv.id as string,
    createdAt: conv.created_at as string,
    updatedAt: conv.updated_at as string,
    messages: (rows ?? []).map((m) => ({
      id: m.id as number,
      role: m.role as "user" | "model",
      content: m.content as string,
      createdAt: m.created_at as string,
    })),
  };
}

/** Permanently removes a conversation; its messages go with it (ON DELETE CASCADE). */
export async function deleteConversation(id: string): Promise<boolean> {
  const { data, error } = await (await createAdminAuthClient())
    .from("conversations")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** Every message of a conversation, oldest first (used for lead extraction). */
export async function getAllMessages(
  conversationId: string,
): Promise<StoredMessage[]> {
  const { data, error } = await (await createAdminAuthClient())
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return data as StoredMessage[];
}

export async function saveLead(
  conversationId: string,
  lead: Lead,
  messageCount: number,
) {
  const { error } = await (await createAdminAuthClient())
    .from("leads")
    .upsert(
      {
        conversation_id: conversationId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        study_country: lead.studyCountry,
        education_level: lead.educationLevel,
        major: lead.major,
        availability: lead.availability,
        wants_consultation: lead.wantsConsultation,
        note: lead.note,
        quality: lead.quality,
        extracted_message_count: messageCount,
        extracted_at: new Date().toISOString(),
      },
      { onConflict: "conversation_id" },
    );
  if (error) throw error;
}

export async function getLead(
  conversationId: string,
): Promise<StoredLead | null> {
  const { data, error } = await (await createAdminAuthClient())
    .from("leads")
    .select("*")
    .eq("conversation_id", conversationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    name: data.name,
    email: data.email,
    phone: data.phone,
    studyCountry: data.study_country,
    educationLevel: data.education_level,
    major: data.major,
    availability: data.availability,
    wantsConsultation: data.wants_consultation,
    note: data.note,
    quality: data.quality,
    extractedMessageCount: data.extracted_message_count,
    extractedAt: data.extracted_at,
  };
}

// ---------- student profiles ----------

import {
  profileFromRow,
  type DocStatus,
  type DocType,
  type IdentityData,
  type IeltsData,
  type StudentProfile,
  type TranscriptData,
} from "@/lib/student-store";

export type AdminProfileListItem = {
  id: string;
  email: string | null;
  displayName: string | null;
  transcriptStatus: DocStatus;
  ieltsStatus: DocStatus;
  identityStatus: DocStatus;
  updatedAt: string;
};

export async function listProfiles(): Promise<AdminProfileListItem[]> {
  const { data, error } = await (await createAdminAuthClient())
    .from("student_profiles")
    .select(
      "id, email, updated_at, transcript_status, ielts_status, identity_status, identity_full_name, transcript_full_name, ielts_full_name",
    )
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    displayName: r.identity_full_name ?? r.transcript_full_name ?? r.ielts_full_name ?? null,
    transcriptStatus: r.transcript_status,
    ieltsStatus: r.ielts_status,
    identityStatus: r.identity_status,
    updatedAt: r.updated_at,
  }));
}

export async function getProfileForAdmin(id: string): Promise<{
  profile: StudentProfile;
  email: string | null;
  createdAt: string;
  updatedAt: string;
} | null> {
  const { data, error } = await (await createAdminAuthClient())
    .from("student_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    profile: profileFromRow(data),
    email: data.email,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

type Columns = Record<string, string | number | null>;

function documentColumns(
  type: DocType,
  data: TranscriptData | IeltsData | IdentityData,
): Columns {
  if (type === "transcript") {
    const d = data as TranscriptData;
    return {
      transcript_full_name: d.fullName,
      transcript_date_of_birth: d.dateOfBirth,
      transcript_gpa: d.gpa,
      transcript_gpa_scale: d.gpaScale,
    };
  }
  if (type === "ielts") {
    const d = data as IeltsData;
    return {
      ielts_full_name: d.fullName,
      ielts_listening: d.listening,
      ielts_reading: d.reading,
      ielts_writing: d.writing,
      ielts_speaking: d.speaking,
      ielts_overall: d.overall,
      ielts_exam_date: d.examDate,
    };
  }
  const d = data as IdentityData;
  return {
    identity_full_name: d.fullName,
    identity_date_of_birth: d.dateOfBirth,
    identity_document_number: d.documentNumber,
  };
}

/**
 * Corrects the information read from one document. Only a document that was read
 * successfully (status hop_le) can be edited. Returns false when nothing was changed: the
 * profile does not exist, or the database refused (RLS: only admins may update).
 */
export async function updateProfileDocument(
  id: string,
  type: DocType,
  data: TranscriptData | IeltsData | IdentityData,
): Promise<boolean> {
  const { data: rows, error } = await (await createAdminAuthClient())
    .from("student_profiles")
    .update({ ...documentColumns(type, data), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq(`${type}_status`, "hop_le")
    .select("id");
  if (error) throw error;
  return (rows?.length ?? 0) > 0;
}

/** Returns false when nothing was deleted (not found, or RLS refused: only admins may delete). */
export async function deleteProfile(id: string): Promise<boolean> {
  const { data, error } = await (await createAdminAuthClient())
    .from("student_profiles")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
