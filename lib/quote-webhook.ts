// Notifies an external automation (Make.com) when a new quote request has been saved.
//
// The webhook URL is in MAKE_WEBHOOK_URL (server env only). It contains a secret token:
// anyone who knows it can post data into the automation, so it must not be committed.
// A failure here must never affect the customer: the request is already saved.

const TIMEOUT_MS = 8000;

export type QuoteWebhookPayload = {
  customerName: string;
  email: string;
  servicePackage: string; // code, e.g. "toan_dien"
  servicePackageName: string; // label, e.g. "Toàn diện"
  price: number; // VND
};

export async function notifyQuoteWebhook(payload: QuoteWebhookPayload) {
  const url = process.env.MAKE_WEBHOOK_URL;
  if (!url) return; // not configured: nothing to notify

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("Quote webhook failed: HTTP", res.status);
    }
  } catch (err) {
    // Log the error type only: never the URL (it is a secret) or the customer's details.
    console.error("Quote webhook failed:", (err as Error).name);
  }
}
