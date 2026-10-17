import { createContextClient } from "@supabase/server/core";

export type School = {
  id: string;
  name: string;
  country: string;
  minGpa: number;
  minIelts: number;
};

/**
 * Reference schools are public data, so this reads with the publishable key
 * (anon role): it only works because of the "Anyone can read schools" RLS policy.
 */
export async function listSchools(): Promise<School[]> {
  const { data, error } = await createContextClient()
    .from("schools")
    .select("id, name, country, min_gpa, min_ielts")
    .order("country", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    country: s.country as string,
    minGpa: Number(s.min_gpa),
    minIelts: Number(s.min_ielts),
  }));
}
