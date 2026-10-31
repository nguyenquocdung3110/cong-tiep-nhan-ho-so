/**
 * Reads app_metadata.role out of an access token (JWT) WITHOUT verifying it. Only used to notice
 * that a token is out of date compared with the account (see proxy.ts); never to grant access.
 */
export function roleInToken(token: string | null | undefined): string | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const role = (JSON.parse(json)?.app_metadata?.role ?? null) as unknown;
    return typeof role === "string" ? role : null;
  } catch {
    return null;
  }
}
