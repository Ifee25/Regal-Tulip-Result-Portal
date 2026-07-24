export const PORTAL_ADMIN_EMAILS = [
  "regaltulipschool@gmail.com",
  "ogechukwuifunanya@gmail.com",
  "chinwe.f.n@gmail.com",
] as const;

export const PRIMARY_ADMIN_EMAIL = "regaltulipschool@gmail.com";

export function isPortalAdmin(email?: string | null): boolean {
  const normalizedEmail = email?.trim().toLowerCase();
  return Boolean(normalizedEmail && PORTAL_ADMIN_EMAILS.includes(normalizedEmail as (typeof PORTAL_ADMIN_EMAILS)[number]));
}

export function canControlStaffAccess(email?: string | null): boolean {
  return email?.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL;
}
