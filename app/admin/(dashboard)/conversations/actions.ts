"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canEdit, getAdminUser } from "@/lib/admin-auth";
import { deleteConversation, getAllMessages, saveLead } from "@/lib/admin-data";
import { isValidConversationId } from "@/lib/chat-store";
import { extractLead } from "@/lib/lead-extractor";

export type DeleteResult = { ok: false; error: string };

const AUTH_ERROR = "Phiên đăng nhập quản trị đã hết hạn. Vui lòng đăng nhập lại.";
const NO_PERMISSION = "Bạn không có quyền thực hiện thao tác này. Chỉ admin được sửa hoặc xóa.";

// Changing or deleting conversation data is for admins only. The role is checked here, and the
// database enforces the same rule again (RLS): these calls run with the user's own session.

export async function deleteConversationAction(
  id: string,
  redirectToList = false,
): Promise<DeleteResult> {
  const user = await getAdminUser();
  if (!user) return { ok: false, error: AUTH_ERROR };
  if (!canEdit(user)) return { ok: false, error: NO_PERMISSION };
  if (!isValidConversationId(id)) {
    return { ok: false, error: "Mã hội thoại không hợp lệ." };
  }
  try {
    const deleted = await deleteConversation(id);
    if (!deleted) {
      return { ok: false, error: "Không xóa được: hội thoại không tồn tại hoặc bạn không có quyền xóa." };
    }
  } catch (err) {
    console.error("Delete conversation failed", err);
    return { ok: false, error: "Không xóa được hội thoại. Thử lại sau." };
  }
  revalidatePath("/admin/conversations");
  if (redirectToList) redirect("/admin/conversations");
  return { ok: false, error: "" }; // list page: revalidation removes the row
}

export async function extractLeadAction(id: string): Promise<{ error: string }> {
  const user = await getAdminUser();
  if (!user) return { error: AUTH_ERROR };
  if (!canEdit(user)) return { error: NO_PERMISSION };
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
