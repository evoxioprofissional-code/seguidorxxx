export const REFERRAL_COOKIE = "seguidorx_ref";

export function normalizeReferralCode(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 32);
}
