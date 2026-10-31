import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { isApprovedCustomerEmail } from "@/lib/quote-store";

// Who may use the student portal:
//   anonymous  -> not logged in (send to /login)
//   no_access  -> logged in with Google, but the email has no approved quote request
//   ok         -> logged in and approved
export type PortalAccess =
  | { state: "anonymous" }
  | { state: "no_access"; user: CurrentUser }
  | { state: "ok"; user: CurrentUser };

export async function getPortalAccess(): Promise<PortalAccess> {
  const user = await getCurrentUser();
  if (!user) return { state: "anonymous" };
  try {
    if (user.email && (await isApprovedCustomerEmail(user.email))) {
      return { state: "ok", user };
    }
  } catch (err) {
    // On any error, deny rather than allow.
    console.error("Approval check failed", (err as Error).message);
  }
  return { state: "no_access", user };
}
