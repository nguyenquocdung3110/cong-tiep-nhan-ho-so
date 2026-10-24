import { createAdminClient } from "@supabase/server/core";
import type { DegreeLevel, ServicePackage } from "@/lib/quote";

// Server-only. quote_requests holds customer names, emails and phone numbers:
// RLS is on with no policies, so only the secret key used here can access it.

export type NewQuoteRequest = {
  customerName: string;
  email: string;
  phone: string;
  studyCountry: string;
  degreeLevel: DegreeLevel;
  servicePackage: ServicePackage;
  price: number;
};

export async function createQuoteRequest(q: NewQuoteRequest) {
  const { error } = await createAdminClient()
    .from("quote_requests")
    .insert({
      customer_name: q.customerName,
      email: q.email,
      phone: q.phone,
      study_country: q.studyCountry,
      degree_level: q.degreeLevel,
      service_package: q.servicePackage,
      price: q.price,
      // status is not set here: the table default ('cho_duyet') applies
    });
  if (error) throw error;
}

// ---------- admin side ----------

export type QuoteStatus = "cho_duyet" | "da_duyet" | "tu_choi";

export type QuoteRequestRow = {
  id: string;
  customerName: string;
  email: string;
  phone: string | null;
  studyCountry: string;
  degreeLevel: string;
  servicePackage: string;
  price: number;
  status: QuoteStatus;
  createdAt: string;
  approvalNotifiedAt: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidQuoteId(id: string): boolean {
  return UUID_RE.test(id);
}

export async function listQuoteRequests(): Promise<QuoteRequestRow[]> {
  const { data, error } = await createAdminClient()
    .from("quote_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false }) // stable order when created_at ties
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    customerName: r.customer_name,
    email: r.email,
    phone: r.phone,
    studyCountry: r.study_country,
    degreeLevel: r.degree_level,
    servicePackage: r.service_package,
    price: Number(r.price),
    status: r.status,
    createdAt: r.created_at,
    approvalNotifiedAt: r.approval_notified_at,
  }));
}

/**
 * Moves a request from pending to approved. The update is conditional on the current
 * status, so only the first click wins: a double click or two admins approving at the
 * same time cannot approve (and therefore notify the customer) twice.
 * Returns the customer's details when this call did the approval, otherwise null.
 */
export async function approveQuoteRequest(
  id: string,
): Promise<{ customerName: string; email: string } | null> {
  const { data, error } = await createAdminClient()
    .from("quote_requests")
    .update({ status: "da_duyet" })
    .eq("id", id)
    .eq("status", "cho_duyet")
    .select("customer_name, email");
  if (error) throw error;
  const row = data?.[0];
  return row ? { customerName: row.customer_name, email: row.email } : null;
}

/** Pending -> rejected. Returns true only if this call changed the status. */
export async function rejectQuoteRequest(id: string): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("quote_requests")
    .update({ status: "tu_choi" })
    .eq("id", id)
    .eq("status", "cho_duyet")
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function markApprovalNotified(id: string) {
  const { error } = await createAdminClient()
    .from("quote_requests")
    .update({ approval_notified_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "da_duyet");
  if (error) throw error;
}

/** An approved request whose customer has not been notified yet (for "send again"). */
export async function getUnnotifiedApproved(
  id: string,
): Promise<{ customerName: string; email: string } | null> {
  const { data, error } = await createAdminClient()
    .from("quote_requests")
    .select("customer_name, email")
    .eq("id", id)
    .eq("status", "da_duyet")
    .is("approval_notified_at", null)
    .maybeSingle();
  if (error) throw error;
  return data ? { customerName: data.customer_name, email: data.email } : null;
}
