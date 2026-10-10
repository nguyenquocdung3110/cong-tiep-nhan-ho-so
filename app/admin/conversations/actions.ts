"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deleteConversation,
  getAllMessages,
  isValidConversationId,
  saveLead,
} from "@/lib/chat-store";
import { extractLead } from "@/lib/lead-extractor";

export type DeleteResult = { ok: false; error: string };

export async function deleteConversationAction(
  id: string,
  redirectToList = false,
): Promise<DeleteResult> {
  if (!isValidConversationId(id)) {
    return { ok: false, error: "Mã hội thoại không hợp lệ." };
  }
  try {
    await deleteConversation(id);
  } catch (err) {
    console.error("Delete conversation failed", err);
    return { ok: false, error: "Không xóa được hội thoại. Thử lại sau." };
  }
  revalidatePath("/admin/conversations");
  if (redirectToList) redirect("/admin/conversations");
  return { ok: false, error: "" }; // list page: revalidation removes the row
}

export async function extractLeadAction(
  id: string,
): Promise<{ error: string }> {
  if (!isValidConversationId(id)) return { error: "Mã hội thoại không hợp lệ." };
  try {
    const messages = await getAllMessages(id);
    if (!messages.some((m) => m.role === "user")) {
      return { error: "Cuộc trò chuyện chưa có tin nhắn của khách." };
    }
    const lead = await extractLead(messages);
    await saveLead(id, lead, messages.length);
  } catch (err) {
    console.error("Extract lead failed", err);
    return { error: "Không trích xuất được thông tin lead. Thử lại sau." };
  }
  revalidatePath(`/admin/conversations/${id}`);
  return { error: "" };
}
