import { getPortalAccess } from "@/lib/access";
import { basisKey, suggestScholarships } from "@/lib/scholarship-advisor";
import { buildAdvisorInput } from "@/lib/scholarship-input";
import { listSchools } from "@/lib/schools";
import { getProfileByUser, saveScholarshipSuggestions } from "@/lib/student-store";

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST() {
  const access = await getPortalAccess();
  if (access.state === "anonymous") return errorResponse("Bạn cần đăng nhập.", 401);
  if (access.state === "no_access") {
    return errorResponse("Tài khoản này chưa có quyền truy cập cổng hồ sơ.", 403);
  }
  const user = access.user;

  try {
    const profile = await getProfileByUser(user.id);
    if (!profile) return errorResponse("Bạn chưa có hồ sơ. Hãy nộp giấy tờ trước.", 400);

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

    await saveScholarshipSuggestions(profile.id, suggestions, basisKey(input));
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Scholarship endpoint failed", (err as Error).message);
    return errorResponse("Không xử lý được yêu cầu lúc này.", 500);
  }
}
