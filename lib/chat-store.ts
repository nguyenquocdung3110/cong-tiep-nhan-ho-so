import { createAdminClient } from "@supabase/server/core";

// Server-only module. It uses the Supabase secret key, which bypasses RLS.
// The chat tables have RLS enabled with no policies, so this is the only access path.

export type StoredMessage = { role: "user" | "model"; content: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidConversationId(id: string | undefined): id is string {
  return !!id && UUID_RE.test(id);
}

export async function conversationExists(id: string): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("conversations")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function createConversation(): Promise<string> {
  const { data, error } = await createAdminClient()
    .from("conversations")
    .insert({})
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function addMessage(
  conversationId: string,
  role: StoredMessage["role"],
  content: string,
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, role, content });
  if (error) throw error;
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}

/** Most recent `limit` messages of a conversation, oldest first. */
export async function getRecentMessages(
  conversationId: string,
  limit: number,
): Promise<StoredMessage[]> {
  const { data, error } = await createAdminClient()
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as StoredMessage[]).reverse();
}

export type ConversationSummary = {
  id: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview: string;
  leadQuality: LeadQuality | null;
};

export type ConversationMessage = {
  id: number;
  role: "user" | "model";
  content: string;
  createdAt: string;
};

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
  const { data, error } = await createAdminClient()
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
  const supabase = createAdminClient();
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
  const { data, error } = await createAdminClient()
    .from("conversations")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export type LeadQuality = "good" | "ok" | "spam";

export type Lead = {
  name: string | null;
  email: string | null;
  phone: string | null;
  studyCountry: string | null;
  educationLevel: string | null;
  major: string | null;
  availability: string | null;
  wantsConsultation: boolean;
  note: string | null;
  quality: LeadQuality;
};

export type StoredLead = Lead & {
  extractedMessageCount: number;
  extractedAt: string;
};

/** Every message of a conversation, oldest first (used for lead extraction). */
export async function getAllMessages(
  conversationId: string,
): Promise<StoredMessage[]> {
  const { data, error } = await createAdminClient()
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
  const { error } = await createAdminClient()
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
  const { data, error } = await createAdminClient()
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
