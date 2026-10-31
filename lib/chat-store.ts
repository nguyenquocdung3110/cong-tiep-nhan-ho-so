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
