"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseClient";

const studentData = {
  name: "Grace Okafor",
  className: "Primary 5A",
  term: "Term 1",
  average: "82%",
  position: "2nd",
  attendance: "96%",
  remark: "A very promising performance. Keep up the consistency.",
};

const subjects = [
  { name: "English Language", score: "86" },
  { name: "Mathematics", score: "79" },
  { name: "Science", score: "84" },
  { name: "Social Studies", score: "81" },
  { name: "Civic Education", score: "88" },
];

const announcements = [
  { title: "Term 1 report cards are now available", time: "2 hours ago" },
  { title: "Parent-teacher meeting scheduled for Friday", time: "1 day ago" },
  { title: "School holiday notice for next week", time: "2 days ago" },
];

export default function GuardianPage() {
  const [supabase, setSupabase] = useState<any | null>(null);
  const [user, setUser] = useState<any>(null);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const sb = getBrowserSupabase();
    setSupabase(sb);
    if (!sb) return;
    void sb.auth.getSession().then(({ data }: any) => setUser(data.session?.user ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_event: string, session: any) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (!supabase) throw new Error("Supabase client not initialized");
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setMessage(error ? error.message : "Signed in successfully.");
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { portal_role: "guardian" } } });
        setMessage(error ? error.message : "Account created. Please check your email for confirmation.");
      }
    } catch (error: any) {
      setMessage(error?.message ?? String(error));
    }
    setLoading(false);
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setPassword("");
    setMessage("Signed out.");
  }

  if (!user) {
    return <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7fbff_0%,_#eef7ff_45%,_#f8fafc_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row lg:items-center">
        <div className="max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-600">Parent portal</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Access your child&apos;s result with ease.</h1>
          <p className="mt-3 text-base text-slate-600">Sign in or create an account to view the latest report card, attendance, and school announcements.</p>
          <Link href="/" className="mt-6 inline-block rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back home</Link>
        </div>

        <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-xl">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/10 p-5">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">Guardian access</p><h2 className="mt-2 text-xl font-semibold">{mode === "sign-in" ? "Sign in" : "Create account"}</h2></div>
              <button type="button" onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")} className="text-sm font-medium text-sky-300 hover:text-sky-200">{mode === "sign-in" ? "Create account" : "Have an account?"}</button>
            </div>
            <div className="mt-5 space-y-3">
              <label className="block text-sm text-slate-300">Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-800 px-3 py-2 text-white outline-none focus:border-sky-400" placeholder="parent@email.com" /></label>
              <label className="block text-sm text-slate-300">Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-800 px-3 py-2 text-white outline-none focus:border-sky-400" placeholder="Enter your password" /></label>
            </div>
            {message && <p className="mt-4 text-sm text-slate-200">{message}</p>}
            <button type="submit" disabled={loading} className="mt-5 w-full rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-70">{loading ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Create account"}</button>
          </form>
        </div>
      </div>
    </div>;
  }

  return <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7fbff_0%,_#eef7ff_45%,_#f8fafc_100%)] px-4 py-8 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-600">Parent portal</p><h1 className="mt-2 break-words text-3xl font-bold text-slate-900">Welcome back, {user.email}</h1></div>
        <div className="no-print flex flex-wrap gap-2">
          <button onClick={() => window.print()} className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">Print result</button>
          <button onClick={handleSignOut} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Sign out</button>
          <Link href="/" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Back home</Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-600">Student summary</p><h2 className="mt-2 text-2xl font-semibold text-slate-900">{studentData.name}</h2><p className="mt-1 text-sm text-slate-500">{studentData.className} · {studentData.term}</p></div>
            <div className="rounded-2xl bg-sky-600 px-5 py-4 text-white shadow"><p className="text-sm">Overall average</p><p className="text-3xl font-semibold">{studentData.average}</p></div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm text-slate-500">Class position</p><p className="mt-2 text-xl font-semibold text-slate-900">{studentData.position}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm text-slate-500">Attendance</p><p className="mt-2 text-xl font-semibold text-slate-900">{studentData.attendance}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm text-slate-500">Teacher remark</p><p className="mt-2 text-sm font-medium text-slate-900">{studentData.remark}</p></div>
          </div>
          <div className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold text-slate-900">Subject performance</h3><button className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">View full report</button></div>
            <div className="mt-4 space-y-3">{subjects.map((subject) => <div key={subject.name} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><p className="font-medium text-slate-800">{subject.name}</p><p className="text-sm font-semibold text-sky-600">{subject.score}%</p></div><div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-sky-500" style={{ width: `${subject.score}%` }} /></div></div>)}</div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-lg font-semibold text-slate-900">Latest announcements</h3><div className="mt-4 space-y-3">{announcements.map((item) => <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><p className="font-medium text-slate-800">{item.title}</p><p className="mt-1 text-sm text-slate-500">{item.time}</p></div>)}</div></section>
          <section className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm"><p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">Need help?</p><h3 className="mt-2 text-lg font-semibold">Contact the school office</h3><p className="mt-3 text-sm text-slate-300">For account issues or result concerns, reach out to the administration office for assistance.</p><button className="mt-4 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600">Request support</button></section>
        </aside>
      </div>
    </div>
  </div>;
}
