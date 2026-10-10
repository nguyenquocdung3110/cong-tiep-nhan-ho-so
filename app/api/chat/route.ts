import { cookies } from "next/headers";
import {
  addMessage,
  conversationExists,
  createConversation,
  getRecentMessages,
  isValidConversationId,
} from "@/lib/chat-store";

const MODEL = "gemini-3.5-flash-lite";
const MAX_HISTORY = 12; // messages sent to Gemini as context
const MAX_DISPLAY = 100; // messages returned to the browser
const COOKIE_NAME = "chat_conversation";
const MAX_TEXT_LENGTH = 1000;

const SYSTEM_INSTRUCTION = `## Persona
Bạn là Trợ lý AI Tư vấn Du học — một trợ lý ảo thân thiện, nhiệt tình, hỗ trợ học sinh/phụ huynh tìm hiểu về du học.

## Core Task/Objective
💬 Nhiệm vụ của bạn là dẫn dắt cuộc trò chuyện có cấu trúc để hiểu nhu cầu du học của người dùng, thu thập thông tin liên hệ và giới thiệu dịch vụ tư vấn phù hợp. Trả lời ngắn gọn, hữu ích.
💬 Trả lời bằng đúng ngôn ngữ người dùng đang sử dụng.
💬 Mỗi lượt chỉ hỏi một câu hỏi.

## Constraints/Rules
⚠️ QUY TẮC KHÁC:
- Không đề cập chi phí/học phí trừ khi người dùng chủ động hỏi
- Không tự đưa ra cam kết về tỷ lệ đậu visa hoặc học bổng
- Không bịa thông tin: chỉ nêu thông tin có trong prompt này. Tuyệt đối không tự đưa ra con số hay chi tiết cụ thể (học phí, chi phí sinh hoạt, tên trường, điểm chuẩn, điều kiện đầu vào, thời gian xử lý...) khi chưa có trong prompt. Nếu không biết hoặc không chắc, hãy nói thẳng là chưa có thông tin chính xác và mời người dùng liên hệ 0912 345 6789 hoặc để lại thông tin để tư vấn viên hỗ trợ

## Additional Information
🧠 LUỒNG HỘI THOẠI:
1. Hỏi người dùng đang quan tâm du học nước nào (hoặc đang phân vân giữa các nước)
2. Hỏi về mục tiêu/bậc học (THPT, Đại học, Thạc sĩ...) và ngành học quan tâm
3. Dựa trên nhu cầu, giới thiệu dịch vụ tư vấn phù hợp (chọn trường, hồ sơ, xin visa, học bổng...)
4. Hỏi họ có muốn tìm hiểu thêm chi tiết không
5. Nếu có, thu thập lần lượt: họ tên → email → số điện thoại
6. Sau đó, cung cấp thông tin chi tiết hơn về quy trình tư vấn và mời đặt lịch tư vấn miễn phí
7. Hỏi họ có ghi chú/câu hỏi nào khác trước khi kết thúc

## Dịch vụ
Tư vấn chọn trường & ngành học, hỗ trợ hồ sơ apply, tư vấn xin visa, tìm học bổng, đào tạo kỹ năng trước khi du học (ngôn ngữ, phỏng vấn).
Trụ sở: Số 1 Hai Bà Trưng, Hà Nội
Liên hệ: 0912 345 6789

## Configuration
- Mục tiêu: Thu thập lead và đặt lịch tư vấn
- Phong cách trả lời: Cân bằng, đi thẳng vào trọng tâm, tối đa 2-3 câu mỗi lượt trừ khi cần chi tiết hơn`;

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

// The conversation id lives in an httpOnly cookie; the browser never sees
// the database, only what these handlers return.
async function readConversationId(): Promise<string | null> {
  const id = (await cookies()).get(COOKIE_NAME)?.value;
  return isValidConversationId(id) && (await conversationExists(id)) ? id : null;
}

export async function GET() {
  try {
    const id = await readConversationId();
    if (!id) return Response.json({ messages: [] });
    const rows = await getRecentMessages(id, MAX_DISPLAY);
    return Response.json({
      messages: rows.map((m) => ({
        from: m.role === "user" ? "user" : "bot",
        text: m.content,
      })),
    });
  } catch (err) {
    console.error("Load chat history failed", err);
    return errorResponse("Không tải được lịch sử trò chuyện.", 500);
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return errorResponse("Chưa cấu hình GEMINI_API_KEY.", 500);
  }

  let text: unknown;
  try {
    ({ text } = await request.json());
  } catch {
    return errorResponse("Dữ liệu không hợp lệ.", 400);
  }
  if (typeof text !== "string" || !text.trim()) {
    return errorResponse("Dữ liệu không hợp lệ.", 400);
  }
  const userText = text.trim().slice(0, MAX_TEXT_LENGTH);

  let reply: string;
  try {
    let conversationId = await readConversationId();
    if (!conversationId) {
      conversationId = await createConversation();
      (await cookies()).set(COOKIE_NAME, conversationId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    await addMessage(conversationId, "user", userText);

    // Context comes from the database, not from the browser.
    const history = await getRecentMessages(conversationId, MAX_HISTORY);
    // Gemini requires the conversation to start with a user turn.
    while (history.length && history[0].role !== "user") history.shift();
    const contents = history.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents,
          generationConfig: { temperature: 0.2 },
        }),
      },
    );

    if (!res.ok) {
      console.error("Gemini API error", res.status, await res.text());
      return errorResponse("Không thể kết nối trợ lý lúc này.", 502);
    }

    const data = await res.json();
    const answer: string | undefined = data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("")
      .trim();
    if (!answer) {
      return errorResponse("Trợ lý chưa có câu trả lời.", 502);
    }

    await addMessage(conversationId, "model", answer);
    reply = answer;
  } catch (err) {
    console.error("Chat request failed", err);
    return errorResponse("Không thể xử lý yêu cầu lúc này.", 500);
  }

  return Response.json({ reply });
}
