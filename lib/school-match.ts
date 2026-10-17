import type { School } from "@/lib/schools";

// Pure numeric comparison. No AI is involved in deciding who passes: the only AI step
// is reading numbers off the documents; everything below is plain arithmetic, so the
// same inputs always give the same verdict and anyone can re-check it by hand.

// School minimum GPAs are on a 10-point scale.
export const SCHOOL_GPA_SCALE = 10;

export type Criterion = {
  /** The school's minimum. */
  required: number;
  /** The student's value (GPA already on the 10-point scale). */
  actual: number;
  passed: boolean;
};

export type SchoolMatch = {
  school: School;
  gpa: Criterion;
  ielts: Criterion;
  /** Eligible only when BOTH criteria pass (actual >= required). */
  eligible: boolean;
};

export type StudentScores = {
  gpa: number;
  /** Scale the GPA is written on; null is treated as the 10-point scale. */
  gpaScale: number | null;
  /** IELTS overall band score. */
  ielts: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Linear conversion to the 10-point scale (e.g. 3.5 / 4.0 -> 8.75). */
export function gpaOnTenScale(gpa: number, scale: number | null): number {
  const s = scale ?? SCHOOL_GPA_SCALE;
  return round2(s === SCHOOL_GPA_SCALE ? gpa : (gpa / s) * SCHOOL_GPA_SCALE);
}

export function matchSchools(schools: School[], student: StudentScores): SchoolMatch[] {
  const gpa = gpaOnTenScale(student.gpa, student.gpaScale);

  return schools.map((school) => {
    const g: Criterion = { required: school.minGpa, actual: gpa, passed: gpa >= school.minGpa };
    const i: Criterion = {
      required: school.minIelts,
      actual: student.ielts,
      passed: student.ielts >= school.minIelts,
    };
    return { school, gpa: g, ielts: i, eligible: g.passed && i.passed };
  });
}
