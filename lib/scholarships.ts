import { createContextClient } from "@supabase/server/core";

export type Scholarship = {
  name: string;
  schoolName: string;
  minGpa: number | null; // 10-point scale
  minIelts: number | null;
  supportType: "percent" | "full";
  supportPercent: number | null;
};

/**
 * Scholarships are public data, so this reads with the publishable key (anon role),
 * which only works because of the "Anyone can read scholarships" RLS policy.
 * Matches the school by name, ignoring case, with an exact match first and a
 * "contains" match as a fallback for small naming differences.
 */
export async function findScholarshipsBySchool(
  schoolName: string,
): Promise<Scholarship[]> {
  const term = schoolName.trim().slice(0, 100);
  if (!term) return [];

  // "%" and "_" are wildcards in ILIKE; the school name never needs them.
  const safe = term.replace(/[%_]/g, "");
  const run = async (pattern: string) => {
    const { data, error } = await createContextClient()
      .from("scholarships")
      .select(
        "name, min_gpa, min_ielts, support_type, support_percent, schools!inner(name)",
      )
      .ilike("schools.name", pattern);
    if (error) throw error;
    return data ?? [];
  };

  let rows = await run(safe); // case-insensitive exact match
  if (rows.length === 0) rows = await run(`%${safe}%`); // fallback: contains

  return rows.map((r) => {
    const school = r.schools as unknown as { name: string } | { name: string }[];
    return {
      name: r.name as string,
      schoolName: (Array.isArray(school) ? school[0] : school).name,
      minGpa: r.min_gpa === null ? null : Number(r.min_gpa),
      minIelts: r.min_ielts === null ? null : Number(r.min_ielts),
      supportType: r.support_type as "percent" | "full",
      supportPercent: r.support_percent === null ? null : Number(r.support_percent),
    };
  });
}

export function supportText(s: Pick<Scholarship, "supportType" | "supportPercent">) {
  return s.supportType === "full"
    ? "Toàn phần"
    : `${Number(s.supportPercent)}% học phí`;
}
