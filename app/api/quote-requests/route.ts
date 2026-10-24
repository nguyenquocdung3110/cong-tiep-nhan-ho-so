import { after } from "next/server";
import { createQuoteRequest } from "@/lib/quote-store";
import { notifyQuoteWebhook } from "@/lib/quote-webhook";
import {
  calculatePrice,
  isCountry,
  isDegreeLevel,
  isValidEmail,
  isValidPhone,
  isServicePackage,
  PACKAGE_NAMES,
} from "@/lib/quote";


function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Dữ liệu không hợp lệ.", 400);
  }
  if (!body || typeof body !== "object") {
    return errorResponse("Dữ liệu không hợp lệ.", 400);
  }

  const { name, email, phone, country, degreeLevel, servicePackage, website } = body;

  // Honeypot: real visitors never see or fill this field. Bots that do get a
  // normal-looking success and nothing is saved.
  if (typeof website === "string" && website.trim() !== "" && isServicePackage(servicePackage)) {
    return Response.json({
      price: calculatePrice(servicePackage),
      packageName: PACKAGE_NAMES[servicePackage],
    });
  }

  const customerName = typeof name === "string" ? name.trim() : "";
  const customerEmail = typeof email === "string" ? email.trim() : "";
  const customerPhone = typeof phone === "string" ? phone.trim() : "";

  if (customerName.length < 1 || customerName.length > 200) {
    return errorResponse("Vui lòng nhập họ tên.", 400);
  }
  if (!isValidEmail(customerEmail)) {
    return errorResponse("Email không hợp lệ.", 400);
  }
  if (!isValidPhone(customerPhone)) {
    return errorResponse("Số điện thoại không hợp lệ.", 400);
  }
  if (!isCountry(country)) return errorResponse("Vui lòng chọn quốc gia.", 400);
  if (!isDegreeLevel(degreeLevel)) return errorResponse("Vui lòng chọn bậc học.", 400);
  if (!isServicePackage(servicePackage)) {
    return errorResponse("Vui lòng chọn gói dịch vụ.", 400);
  }

  // The price comes from the server's price table only; the browser's value is never used.
  const price = calculatePrice(servicePackage);

  try {
    await createQuoteRequest({
      customerName,
      email: customerEmail,
      phone: customerPhone,
      studyCountry: country,
      degreeLevel,
      servicePackage,
      price,
    });
  } catch (err) {
    // Log only the error message, never the customer's details.
    console.error("Save quote request failed", (err as Error).message);
    return errorResponse("Chưa lưu được yêu cầu lúc này, vui lòng thử lại sau.", 500);
  }

  // Tell the automation about the saved request after the response is sent, so a slow or
  // failing webhook never delays or breaks the customer's quote.
  after(() =>
    notifyQuoteWebhook({
      customerName,
      email: customerEmail,
      servicePackage,
      servicePackageName: PACKAGE_NAMES[servicePackage],
      price,
    }),
  );

  return Response.json({ price, packageName: PACKAGE_NAMES[servicePackage] });
}
