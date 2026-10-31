"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canEdit, getAdminUser } from "@/lib/admin-auth";
import { deleteProfile, updateProfileDocument } from "@/lib/admin-data";
import { isValidConversationId as isUuid } from "@/lib/chat-store";
import { parseIdentity, parseIelts, parseTranscript } from "@/lib/profile-edit";
import type { DocType } from "@/lib/student-store";

export type ProfileActionResult = { ok: boolean; message: string };

const AUTH_ERROR: ProfileActionResult = {
  ok: false,
  message: "Phiên đăng nhập quản trị đã hết hạn. Vui lòng đăng nhập lại.",
};
const NO_PERMISSION: ProfileActionResult = {
  ok: false,
  message: "Bạn không có quyền thực hiện thao tác này. Chỉ admin được sửa hoặc xóa.",
};
const FAILED: ProfileActionResult = { ok: false, message: "Không xử lý được yêu cầu. Thử lại sau." };

// Student data can be corrected or deleted by admins only. The role is checked here, and the
// database enforces the same rule again (RLS): these calls run with the user's own session.

export async function updateProfileDocumentAction(
  id: string,
  type: DocType,
  _previous: ProfileActionResult | null,
  formData: FormData,
): Promise<ProfileActionResult> {
  const user = await getAdminUser();
  if (!user) return AUTH_ERROR;
  if (!canEdit(user)) return NO_PERMISSION;
  if (!isUuid(id) || (type !== "transcript" && type !== "ielts" && type !== "identity")) {
    return { ok: false, message: "Dữ liệu không hợp lệ." };
  }

  const parsed =
    type === "transcript"
      ? parseTranscript(formData)
      : type === "ielts"
        ? parseIelts(formData)
        : parseIdentity(formData);
  if (!parsed.ok) return { ok: false, message: parsed.error };

  try {
    const changed = await updateProfileDocument(id, type, parsed.data);
    if (!changed) {
      return {
        ok: false,
        message: "Không lưu được: giấy tờ này không còn ở trạng thái hợp lệ hoặc bạn không có quyền sửa.",
      };
    }
  } catch (err) {
    console.error("Update profile failed", (err as Error).message);
    return FAILED;
  }
  revalidatePath(`/admin/profiles/${id}`);
  revalidatePath("/admin/profiles");
  return { ok: true, message: "Đã lưu thay đổi." };
}

export async function deleteProfileAction(id: string): Promise<ProfileActionResult> {
  const user = await getAdminUser();
  if (!user) return AUTH_ERROR;
  if (!canEdit(user)) return NO_PERMISSION;
  if (!isUuid(id)) return { ok: false, message: "Mã hồ sơ không hợp lệ." };
  try {
    const deleted = await deleteProfile(id);
    if (!deleted) {
      return { ok: false, message: "Không xóa được: hồ sơ không tồn tại hoặc bạn không có quyền xóa." };
    }
  } catch (err) {
    console.error("Delete profile failed", (err as Error).message);
    return FAILED;
  }
  revalidatePath("/admin/profiles");
  redirect("/admin/profiles");
}
