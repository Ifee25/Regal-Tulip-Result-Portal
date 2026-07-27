"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import { clearAdminSession } from "@/lib/adminAuth";
import { isListedStaffEmail } from "@/lib/staffClassAccess";
import { isPortalAdmin } from "@/lib/portalAdmins";

export default function AuthForm() {
  const [supabase, setSupabase] = useState<any | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const sb = getBrowserSupabase();
    setSupabase(sb);
    if (!sb) return;

    (async () => {
      const { data } = await sb.auth.getSession();
      if (!mounted) return;
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        router.replace("/dashboard");
        return;
      }

    })();

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        router.replace("/dashboard");
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === "sign-in") {
        if (!supabase) {
          setMessage("Supabase is not configured. Configure the project before signing in.");
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setMessage(error.message);
        } else {
          setMessage("Signed in successfully.");
          router.replace("/dashboard");
        }
      } else {
        if (!supabase) {
          setMessage("Supabase is not configured. Account creation is unavailable until environment values are provided.");
          setLoading(false);
          return;
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (!isPortalAdmin(normalizedEmail) && !isListedStaffEmail(normalizedEmail)) {
          setMessage("This email address is not authorized to create a staff account.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { portal_role: "staff" } },
        });
        if (error) {
          setMessage(error.message);
        } else {
          setMessage("Sign-up successful. Check your email for confirmation.");
          if (data.session) {
            router.replace("/dashboard");
          }
        }
      }
    } catch (err: any) {
      const errorMessage = err?.message ?? String(err);
      setMessage(
        errorMessage === "Failed to fetch"
          ? "Could not reach Supabase from this device. Check the device internet connection and try again."
          : errorMessage,
      );
    }

    setLoading(false);
  }

  async function signOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    clearAdminSession();
    setUser(null);
    setMessage("Signed out.");
  }

  async function handleForgotPassword() {
    setMessage(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessage("Enter your staff email address first, then select Forgot password.");
      return;
    }
    if (!supabase) {
      setMessage("Supabase is not configured. Password recovery is unavailable.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    setMessage(error ? error.message : "Password reset link sent. Check your email inbox and spam folder.");
  }

  if (user)
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7fbff_0%,_#eef7ff_45%,_#f8fafc_100%)] px-4 py-10 sm:px-6 md:px-8">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-600">Admin access</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">You are signed in</h2>
          <p className="mt-2 text-sm text-slate-600">Signed in as <strong>{user.email}</strong></p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button onClick={() => router.push("/dashboard")} className="w-full sm:w-auto rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
              Go to dashboard
            </button>
            <button onClick={signOut} className="w-full sm:w-auto rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Sign out
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7fbff_0%,_#eef7ff_45%,_#f8fafc_100%)] px-4 py-8 sm:px-6 md:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:flex-row md:items-center md:justify-center">
        <div className="w-full md:w-1/2 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-600">Admin access</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Manage school results from a secure dashboard.</h1>
          <p className="mt-3 text-base text-slate-600">Sign in to update student records, control staff uploads, and review guardian-facing information.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link href="/" className="w-full sm:w-auto text-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back home</Link>
            <Link href="/guardian" className="w-full sm:w-auto text-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">Open guardian portal</Link>
          </div>
        </div>

        <div className="w-full md:w-1/2 rounded-3xl border border-slate-200 bg-slate-900 p-4 sm:p-6 text-white shadow-xl">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/10 p-4 sm:p-5">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">Staff sign in</p>
                <h2 className="mt-2 text-xl font-semibold">{mode === "sign-in" ? "Sign in" : "Create account"}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode((current) => current === "sign-in" ? "sign-up" : "sign-in");
                  setMessage(null);
                }}
                className="min-h-11 w-full touch-manipulation rounded-xl border border-sky-400/40 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-400/10 hover:text-sky-200 sm:min-h-0 sm:w-auto sm:border-0 sm:px-0 sm:py-0"
              >
                {mode === "sign-in" ? "Create account" : "Have an account?"}
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-sm text-slate-300">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="w-full rounded-2xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-sky-400" placeholder="admin@email.com" />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <label className="block text-sm text-slate-300">Password</label>
                  {mode === "sign-in" && <button type="button" onClick={handleForgotPassword} className="text-sm font-semibold text-sky-300 hover:text-sky-200">Forgot password?</button>}
                </div>
                <div className="relative">
                  <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} required minLength={6} className="w-full rounded-2xl border border-white/10 bg-slate-800 py-2 pl-3 pr-12 text-sm text-white outline-none focus:border-sky-400" placeholder="Enter your password" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    title={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-2xl border-l border-white/20 bg-slate-700 text-white shadow-inner hover:bg-sky-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-300"
                  >
                    {showPassword ? (
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2.4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.8 10.8 0 0112 4c5.5 0 9 5 9 5a16.7 16.7 0 01-3.1 3.5M6.2 6.2C4.1 7.6 3 9 3 9s3.5 5 9 5c1 0 2-.2 2.8-.5" />
                      </svg>
                    ) : (
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2.4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {message && <p className="mt-4 text-sm text-slate-200">{message}</p>}

            <button type="submit" disabled={loading} className="mt-5 min-h-12 w-full touch-manipulation rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70">
              {loading ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
