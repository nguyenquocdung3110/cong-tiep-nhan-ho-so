// Single source of truth for the quote form: the options a customer can pick and the price
// table. Prices are calculated on the server from the package only; any price sent by the
// browser is ignored.

export const COUNTRIES = ["Mỹ", "Anh", "Úc", "Canada", "Hàn Quốc", "Nhật Bản"] as const;

export const DEGREE_LEVELS = [
  { value: "thpt", label: "THPT" },
  { value: "dai_hoc", label: "Đại học" },
  { value: "thac_si", label: "Thạc sĩ" },
] as const;

export type DegreeLevel = (typeof DEGREE_LEVELS)[number]["value"];
export type ServicePackage = "co_ban" | "toan_dien";

export const PACKAGE_PRICES: Record<ServicePackage, number> = {
  co_ban: 15_000_000,
  toan_dien: 30_000_000,
};

export const PACKAGE_NAMES: Record<ServicePackage, string> = {
  co_ban: "Cơ bản",
  toan_dien: "Toàn diện",
};

export function calculatePrice(servicePackage: ServicePackage): number {
  return PACKAGE_PRICES[servicePackage];
}

export function formatVnd(value: number) {
  return value.toLocaleString("vi-VN") + "₫";
}

export function isCountry(v: unknown): v is (typeof COUNTRIES)[number] {
  return typeof v === "string" && (COUNTRIES as readonly string[]).includes(v);
}

export function isDegreeLevel(v: unknown): v is DegreeLevel {
  return typeof v === "string" && DEGREE_LEVELS.some((d) => d.value === v);
}

export function isServicePackage(v: unknown): v is ServicePackage {
  return v === "co_ban" || v === "toan_dien";
}

// Same check on the form (instant feedback) and on the server (authoritative):
// something@domain.tld, no spaces, no empty domain labels, TLD of at least 2 characters.
const EMAIL_RE = /^[^@\s]+@([^@\s.]+\.)+[^@\s.]{2,}$/;

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_RE.test(value);
}

const PHONE_RE = /^[0-9+()\s.-]{8,20}$/;

export function isValidPhone(value: string): boolean {
  return PHONE_RE.test(value);
}
