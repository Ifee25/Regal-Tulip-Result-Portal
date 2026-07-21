import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isPortalAdmin } from "@/lib/portalAdmins";


function clients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publishableKey || !secretKey) return null;
  return {
    publicClient: createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } }),
    adminClient: createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}

async function authorize(request: NextRequest) {
  const configured = clients();
  if (!configured) return { error: NextResponse.json({ error: "Server account management is not configured." }, { status: 503 }) };
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  const { data, error } = await configured.publicClient.auth.getUser(token);
  if (error || !isPortalAdmin(data.user?.email)) {
    return { error: NextResponse.json({ error: "Only the administrator can manage accounts." }, { status: 403 }) };
  }
  return { adminClient: configured.adminClient, actingAdminEmail: data.user.email?.toLowerCase() };
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if (auth.error || !auth.adminClient) return auth.error;
  const { data, error } = await auth.adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ users: data.users.map((user) => ({ id: user.id, email: user.email, created_at: user.created_at, last_sign_in_at: user.last_sign_in_at, email_confirmed_at: user.email_confirmed_at })) });
}

export async function DELETE(request: NextRequest) {
  const auth = await authorize(request);
  if (auth.error || !auth.adminClient) return auth.error;
  const body = await request.json() as { id?: string; email?: string };
  const email = body.email?.trim().toLowerCase();
  if (!body.id || !email) return NextResponse.json({ error: "Account ID and email are required." }, { status: 400 });
  if (isPortalAdmin(email)) return NextResponse.json({ error: "Administrator accounts cannot be deleted." }, { status: 400 });

  const { error: blockError } = await auth.adminClient.from("blocked_emails").upsert({ email, blocked_by: auth.actingAdminEmail ?? "portal-administrator" }, { onConflict: "email" });
  if (blockError) return NextResponse.json({ error: `Could not block email: ${blockError.message}` }, { status: 400 });
  await auth.adminClient.from("staff_access").delete().ilike("email", email);
  const { error: deleteError } = await auth.adminClient.auth.admin.deleteUser(body.id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
