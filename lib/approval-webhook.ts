// Sends an approved quote request to Make.com so the customer gets their login link.
//
// Env (server only):
//   MAKE_APPROVAL_WEBHOOK_URL  webhook URL (contains a secret token: never commit it)
//   STUDENT_LOGIN_URL          the login link sent to the customer: the address of this
//                              site's /login page (Sign in with Google). Locally it is
//                              http://localhost:3000/login; in production set it to the real
//                              domain, e.g. https://your-domain/login. The payload and the
//                              Make scenario do not change.

const TIMEOUT_MS = 8000;

export type ApprovalWebhookPayload = {
  customerName: string;
  email: string;
  loginUrl: string;
};

export function getLoginUrl(): string {
  const explicit = process.env.STUDENT_LOGIN_URL?.trim();
  if (explicit) return explicit;
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${site}/login`;
}

/** Resolves true only when Make accepted the request (HTTP 2xx). Never throws. */
export async function sendApprovalWebhook(customer: {
  customerName: string;
  email: string;
}): Promise<boolean> {
  const url = process.env.MAKE_APPROVAL_WEBHOOK_URL;
  if (!url) {
    console.error("Approval webhook not configured (MAKE_APPROVAL_WEBHOOK_URL is empty)");
    return false;
  }

  const payload: ApprovalWebhookPayload = {
    customerName: customer.customerName,
    email: customer.email,
    loginUrl: getLoginUrl(),
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("Approval webhook failed: HTTP", res.status);
      return false;
    }
    return true;
  } catch (err) {
    // Error type only: never the URL (a secret) or the customer's details.
    console.error("Approval webhook failed:", (err as Error).name);
    return false;
  }
}
