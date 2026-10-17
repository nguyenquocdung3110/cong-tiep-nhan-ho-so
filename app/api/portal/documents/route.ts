import { cookies } from "next/headers";
import { extractDocument } from "@/lib/document-extractor";
import {
  createProfile,
  isValidProfileId,
  profileExists,
  saveDocument,
  type DocType,
} from "@/lib/student-store";

const COOKIE_NAME = "student_profile";
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB (also fits common serverless body limits)

type Mime = "application/pdf" | "image/jpeg" | "image/png";

const ALLOWED: Record<DocType, Mime[]> = {
  transcript: ["application/pdf"],
  ielts: ["image/jpeg", "image/png"],
  identity: ["image/jpeg", "image/png"],
};

const WRONG_FORMAT: Record<DocType, string> = {
  transcript: "Bảng điểm chỉ chấp nhận file PDF.",
  ielts: "Chứng chỉ IELTS chỉ chấp nhận ảnh JPG hoặc PNG.",
  identity: "CMND/CCCD/hộ chiếu chỉ chấp nhận ảnh JPG hoặc PNG.",
};

// Decide the real format from the file's magic bytes, not from the client-supplied type.
function sniffMime(b: Uint8Array): Mime | null {
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) {
    return "application/pdf";
  }
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  return null;
}

function isDocType(v: unknown): v is DocType {
  return v === "transcript" || v === "ielts" || v === "identity";
}

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function safeFileName(name: string) {
  const base = name.split(/[\/]/).pop() ?? "";
  return base.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 120) || "tai-lieu";
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse("Dữ liệu không hợp lệ.", 400);
  }

  const type = form.get("type");
  const file = form.get("file");
  if (!isDocType(type) || !(file instanceof File)) {
    return errorResponse("Dữ liệu không hợp lệ.", 400);
  }
  if (file.size === 0) return errorResponse("File rỗng.", 400);
  if (file.size > MAX_FILE_SIZE) {
    return errorResponse("File quá lớn, tối đa 4 MB.", 413);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes);
  if (!mime || !ALLOWED[type].includes(mime)) {
    return errorResponse(WRONG_FORMAT[type], 415);
  }

  try {
    const jar = await cookies();
    let profileId = jar.get(COOKIE_NAME)?.value;
    if (!isValidProfileId(profileId) || !(await profileExists(profileId))) {
      profileId = await createProfile();
      jar.set(COOKIE_NAME, profileId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    let result;
    try {
      result = await extractDocument(type, bytes, mime);
    } catch (err) {
      console.error("Document extraction failed", (err as Error).message);
      return errorResponse("Chưa đọc được giấy tờ lúc này, vui lòng thử lại sau.", 502);
    }

    await saveDocument(profileId, type, result, safeFileName(file.name));
    return Response.json({
      status: result.ok ? "hop_le" : "can_nop_lai",
      reason: result.ok ? null : result.reason,
    });
  } catch (err) {
    console.error("Upload document failed", (err as Error).message);
    return errorResponse("Không xử lý được yêu cầu lúc này.", 500);
  }
}
