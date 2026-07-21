"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const [supabase, setSupabase] = useState<any | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Open this page from the password-reset link sent to your email.");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    setSupabase(getBrowserSupabase());
  }, []);

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 6) {
      setMessage("Your new password must contain at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("The two passwords do not match.");
      return;
    }
    if (!supabase) {
      setMessage("The password recovery service is unavailable.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setComplete(true);
    setMessage("Password changed successfully. You can now sign in with the new password.");
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-white">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-6 shadow-xl sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">Staff recovery</p>
      <h1 className="mt-3 text-2xl font-bold">Reset your password</h1>
      {!complete && <form onSubmit={updatePassword} className="mt-6 space-y-4">
        <label className="block text-sm text-slate-300">New password<input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-800 px-3 py-3 text-white outline-none focus:border-sky-400" /></label>
        <label className="block text-sm text-slate-300">Confirm new password<input required type="password" minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-800 px-3 py-3 text-white outline-none focus:border-sky-400" /></label>
        <button disabled={loading} className="min-h-12 w-full rounded-2xl bg-sky-500 font-semibold hover:bg-sky-600 disabled:opacity-60">{loading ? "Updating..." : "Update password"}</button>
      </form>}
      <p className="mt-4 rounded-xl bg-white/10 p-3 text-sm text-slate-200">{message}</p>
      <Link href="/login" className="mt-5 inline-block text-sm font-semibold text-sky-300">Back to staff sign in</Link>
    </section>
  </main>;
}
