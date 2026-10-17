import type { AdvisorInput } from "@/lib/scholarship-advisor";
import { gpaOnTenScale, matchSchools } from "@/lib/school-match";
import type { School } from "@/lib/schools";
import type { StudentProfile } from "@/lib/student-store";

/**
 * Builds what the scholarship AI is allowed to see, or null if the profile is not
 * complete and valid, or no school is eligible. Which schools are eligible is decided
 * here by plain numeric comparison. Name, date of birth and ID number are never included.
 */
export function buildAdvisorInput(
  profile: StudentProfile,
  schools: School[],
): { input: AdvisorInput | null; reason: "incomplete" | "no_eligible_school" | null } {
  const { transcript, ielts, identity } = profile;
  const gpa = transcript.data.gpa;
  const overall = ielts.data.overall;
  if (
    transcript.status !== "hop_le" ||
    ielts.status !== "hop_le" ||
    identity.status !== "hop_le" ||
    gpa === null ||
    overall === null
  ) {
    return { input: null, reason: "incomplete" };
  }

  const eligibleSchools = matchSchools(schools, {
    gpa,
    gpaScale: transcript.data.gpaScale,
    ielts: overall,
  })
    .filter((m) => m.eligible)
    .map((m) => m.school.name);
  if (eligibleSchools.length === 0) return { input: null, reason: "no_eligible_school" };

  return {
    input: {
      gpa10: gpaOnTenScale(gpa, transcript.data.gpaScale),
      ielts: {
        overall,
        listening: ielts.data.listening,
        reading: ielts.data.reading,
        writing: ielts.data.writing,
        speaking: ielts.data.speaking,
      },
      eligibleSchools,
    },
    reason: null,
  };
}
