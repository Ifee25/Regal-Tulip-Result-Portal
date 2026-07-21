function stripQuotes(v?: string | null): string | null {
  if (!v) return null;
  return v.replace(/^"|"$/g, "");
}

export function getAdminSession(): { email: string } | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem("regal-tulip-admin");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: string };
    return parsed.email ? { email: parsed.email } : null;
  } catch {
    return null;
  }
}

export function setAdminSession(email: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("regal-tulip-admin", JSON.stringify({ email: email.trim().toLowerCase() }));
}

export function clearAdminSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("regal-tulip-admin");
}

export function isDemoAdminLogin(email: string, password: string) {
  const expectedEmail = stripQuotes(process.env.NEXT_PUBLIC_ADMIN_EMAIL) || "admin@regaltulip.com";
  const expectedPassword = stripQuotes(process.env.NEXT_PUBLIC_ADMIN_PASSWORD) || "school2026";

  return email.trim().toLowerCase() === expectedEmail.trim().toLowerCase() && password === expectedPassword;
}
