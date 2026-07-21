export const PORTAL_ADMIN_EMAILS = [
  "regaltulipschool@gmail.com",
  "ogechiukwuifunanya@gmail.com",
] as const;

export function isPortalAdmin(email?: string | null): boolean {
  const normalizedEmail = email?.trim().toLowerCase();
  return Boolean(normalizedEmail && PORTAL_ADMIN_EMAILS.includes(normalizedEmail as (typeof PORTAL_ADMIN_EMAILS)[number]));
}
