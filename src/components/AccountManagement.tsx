"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import { isPortalAdmin } from "@/lib/portalAdmins";

type Account = { id: string; email?: string; created_at: string; last_sign_in_at?: string; email_confirmed_at?: string };

export default function AccountManagement() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const request = useCallback(async (method = "GET", body?: object) => {
    const supabase = getBrowserSupabase();
    const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
    const token = data.session?.access_token;
    if (!token) throw new Error("Sign in with the Supabase administrator account to manage users.");
    const response = await fetch("/api/admin/users", { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Account request failed.");
    return payload;
  }, []);

  const loadAccounts = useCallback(async () => {
    setLoading(true); setMessage(null);
    try { const data = await request(); setAccounts(data.users ?? []); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not load accounts."); }
    finally { setLoading(false); }
  }, [request]);

  useEffect(() => { queueMicrotask(() => void loadAccounts()); }, [loadAccounts]);

  async function removeAccount(account: Account) {
    if (!account.email || !confirm(`Delete ${account.email} and permanently block this email from registering again?`)) return;
    setMessage(null);
    try { await request("DELETE", { id: account.id, email: account.email }); setAccounts((current) => current.filter((item) => item.id !== account.id)); setMessage(`${account.email} was deleted and blocked.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not delete the account."); }
  }

  return <section className="rounded-3xl border border-slate-800 bg-white p-6 text-slate-900 shadow-xl">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-600">Account management</p><h3 className="mt-2 text-xl font-semibold">Registered staff accounts</h3></div><button onClick={loadAccounts} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Refresh accounts</button></div>
    {message && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
    {loading ? <p className="mt-5 text-sm text-slate-500">Loading accounts...</p> : <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left">Email</th><th className="px-4 py-3 text-left">Confirmed</th><th className="px-4 py-3 text-left">Created</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{accounts.map((account) => <tr key={account.id}><td className="px-4 py-3 font-medium">{account.email ?? "No email"}</td><td className="px-4 py-3">{account.email_confirmed_at ? "Yes" : "No"}</td><td className="px-4 py-3">{new Date(account.created_at).toLocaleDateString()}</td><td className="px-4 py-3 text-right">{isPortalAdmin(account.email) ? <span className="font-semibold text-sky-700">Administrator</span> : <button onClick={() => removeAccount(account)} className="rounded-lg bg-red-600 px-3 py-2 font-semibold text-white hover:bg-red-700">Delete and block</button>}</td></tr>)}</tbody></table></div>}
  </section>;
}
