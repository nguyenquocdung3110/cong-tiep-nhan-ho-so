import { cookies } from "next/headers";
import { basisKey, suggestScholarships } from "@/lib/scholarship-advisor";
import { buildAdvisorInput } from "@/lib/scholarship-input";
import { listSchools } from "@/lib/schools";
import {
  getProfile,
  isValidProfileId,
  saveScholarshipSuggestions,
} from "@/lib/student-store";

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST() {
  const id = (await cookies()).get("student_profile")?.value;
  if (!isValidProfileId(id)) {
    return errorResponse("Bạn chưa có hồ sơ. Hãy nộp giấy tờ trước.", 400);
  }

  try {
    const profile = await getProfile(id);
    if (!profile) return errorResponse("Không tìm thấy hồ sơ.", 404);

    const { input, reason } = buildAdvisorInput(profile, await listSchools());
    if (!input) {
      return errorResponse(
        reason === "incomplete"
          ? "Hồ sơ cần đủ 3 giấy tờ hợp lệ trước khi gợi ý học bổng."
          : "Chưa có trường nào đạt yêu cầu nên chưa có học bổng để gợi ý.",
        409,
      );
    }

    let suggestions;
    try {
      suggestions = await suggestScholarships(input);
    } catch (err) {
      console.error("Scholarship suggestion failed", (err as Error).message);
      return errorResponse("Chưa gợi ý được học bổng lúc này, vui lòng thử lại sau.", 502);
    }

    await saveScholarshipSuggestions(id, suggestions, basisKey(input));
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Scholarship endpoint failed", (err as Error).message);
    return errorResponse("Không xử lý được yêu cầu lúc này.", 500);
  }
}
