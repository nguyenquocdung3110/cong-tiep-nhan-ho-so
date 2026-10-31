"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";
import { sendApprovalWebhook } from "@/lib/approval-webhook";
import {
  approveQuoteRequest,
  getUnnotifiedApproved,
  isValidQuoteId,
  markApprovalNotified,
  rejectQuoteRequest,
} from "@/lib/quote-store";

export type ActionResult = {
  tone: "success" | "warning" | "error";
  message: string;
};

const NOT_ADMIN: ActionResult = {
  tone: "error",
  message: "Phiên đăng nhập quản trị đã hết hạn. Vui lòng đăng nhập lại.",
};
const INVALID: ActionResult = { tone: "error", message: "Mã yêu cầu không hợp lệ." };
const FAILED: ActionResult = { tone: "error", message: "Không xử lý được yêu cầu. Thử lại sau." };

export async function approveRequestAction(id: string): Promise<ActionResult> {
  if (!(await getAdminUser())) return NOT_ADMIN;
  if (!isValidQuoteId(id)) return INVALID;
  try {
    const customer = await approveQuoteRequest(id);
    if (!customer) {
      revalidatePath("/admin/requests");
      return { tone: "warning", message: "Yêu cầu này đã được xử lý trước đó." };
    }

    // The request is approved at this point. Tell Make so the customer gets the login link.
    const sent = await sendApprovalWebhook(customer);
    if (sent) await markApprovalNotified(id);
    revalidatePath("/admin/requests");
    return sent
      ? { tone: "success", message: "Đã duyệt và gửi link đăng nhập cho khách." }
      : {
          tone: "warning",
          message: "Đã duyệt, nhưng chưa gửi được link đăng nhập tới Make. Bấm \"Gửi lại\".",
        };
  } catch (err) {
    console.error("Approve request failed", (err as Error).message);
    return FAILED;
  }
}

export async function resendApprovalAction(id: string): Promise<ActionResult> {
  if (!(await getAdminUser())) return NOT_ADMIN;
  if (!isValidQuoteId(id)) return INVALID;
  try {
    const customer = await getUnnotifiedApproved(id);
    if (!customer) {
      revalidatePath("/admin/requests");
      return { tone: "warning", message: "Không còn gì cần gửi lại." };
    }
    const sent = await sendApprovalWebhook(customer);
    if (sent) await markApprovalNotified(id);
    revalidatePath("/admin/requests");
    return sent
      ? { tone: "success", message: "Đã gửi link đăng nhập cho khách." }
      : { tone: "warning", message: "Vẫn chưa gửi được tới Make. Thử lại sau." };
  } catch (err) {
    console.error("Resend approval failed", (err as Error).message);
    return FAILED;
  }
}

export async function rejectRequestAction(id: string): Promise<ActionResult> {
  if (!(await getAdminUser())) return NOT_ADMIN;
  if (!isValidQuoteId(id)) return INVALID;
  try {
    const changed = await rejectQuoteRequest(id);
    revalidatePath("/admin/requests");
    return changed
      ? { tone: "success", message: "Đã từ chối yêu cầu." }
      : { tone: "warning", message: "Yêu cầu này đã được xử lý trước đó." };
  } catch (err) {
    console.error("Reject request failed", (err as Error).message);
    return FAILED;
  }
}
