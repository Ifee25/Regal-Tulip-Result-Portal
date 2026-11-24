"use client";

import Image from "next/image";
import { useState } from "react";
import type { AssessmentResult } from "@/types/assessment";

type Report = { id: string; class_name: string; term: string; average_score: number; assessment_data: AssessmentResult | string | null };
type Props = {
  account: { pupil: { id: string; name: string; last_name: string; reg_no: string }; results: Report[] };
  busy: boolean;
  message: string;
  onSignOut: () => void;
  onSelectResult: (report: Report) => void;
};

function UserIcon({ className = "h-5 w-5" }: { className?: string }) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg>;
}

function ResultIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h5" /></svg>;
}

export default function GuardianDashboard({ account, busy, message, onSignOut, onSelectResult }: Props) {
  const [menu, setMenu] = useState<"profile" | "result">("result");
  const guardianName = account.pupil.last_name?.trim() ? `Mr/Mrs ${account.pupil.last_name.trim()}` : "Parent/Guardian";
  const currentClass = account.results[0]?.class_name;

  return <main className="min-h-screen bg-[#f1f4f8] text-slate-800">
    <header className="flex min-h-16 items-center justify-between gap-4 bg-blue-950 px-5 text-white sm:px-7">
      <div className="flex min-w-0 items-center gap-3"><div className="rounded-full bg-white p-1.5"><Image src="/school-logo-transparent.png" alt="" width={30} height={30} /></div><div><p className="text-sm font-semibold">Regal Tulip School</p><p className="text-[11px] text-sky-200">Parent / Guardian Portal</p></div></div>
      <button type="button" onClick={onSignOut} disabled={busy} className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-sky-300 disabled:opacity-50">Sign out <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10" /></svg></button>
    </header>

    <div className="min-h-[calc(100vh-4rem)] md:grid md:grid-cols-[230px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="border-b border-slate-200 bg-white md:border-b-0 md:border-r">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"><UserIcon className="h-6 w-6" /></div>
          <div className="min-w-0"><p className="break-words text-sm font-semibold text-blue-950">{guardianName}</p><p className="mt-1 text-xs text-slate-500">Parent/Guardian</p></div>
        </div>
        <nav aria-label="Guardian dashboard" className="px-3 py-4">
          <p className="mb-3 hidden px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 md:block">Main</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
            <button type="button" onClick={() => setMenu("profile")} aria-current={menu === "profile" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-lg px-4 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-sky-600 ${menu === "profile" ? "bg-sky-50 text-sky-700" : "text-slate-600 hover:bg-slate-50"}`}><UserIcon />My Profile</button>
            <button type="button" onClick={() => setMenu("result")} aria-current={menu === "result" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-lg px-4 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-sky-600 ${menu === "result" ? "bg-sky-50 text-sky-700" : "text-slate-600 hover:bg-slate-50"}`}><ResultIcon />Result</button>
          </div>
        </nav>
      </aside>

      <div className="min-w-0">
        <div className="border-b border-slate-200 bg-white px-5 py-5 sm:px-7"><h1 className="text-sm font-semibold uppercase tracking-wide text-blue-950">{menu === "result" ? "Check result" : "My Profile"}</h1></div>
        <div className="mx-auto max-w-7xl p-4 sm:p-7">
          {message && <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{message}</p>}

          {menu === "result" ? <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(250px,1fr)]">
            <section className="min-w-0 rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4"><span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{account.results.length} result{account.results.length === 1 ? "" : "s"} found</span></div>
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600"><UserIcon className="h-6 w-6" /></div><div className="min-w-0"><h2 className="break-words text-sm font-semibold uppercase text-blue-950">{account.pupil.name}</h2><p className="mt-1 text-xs text-slate-500">{currentClass ? `Class: ${currentClass}` : "Registered pupil"}</p></div></div>
                {account.results.length ? <div className="mt-6 divide-y divide-slate-100">{account.results.map(report => <div key={report.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="break-words text-sm font-medium">{report.class_name} <span className="text-slate-300">/</span> {report.term}</p>{!report.class_name.startsWith("Nursery") && <p className="mt-1 text-xs text-slate-500">Average: {report.average_score}%</p>}</div>{report.assessment_data ? <button type="button" onClick={() => onSelectResult(report)} className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"><ResultIcon />Check Result</button> : <p className="text-xs text-slate-500">Full report unavailable</p>}</div>)}</div> : <p className="mt-6 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-500">No results have been uploaded for your child yet. Please check again after the school publishes their report.</p>}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm"><h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 text-sm font-semibold"><svg aria-hidden="true" className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 20V9M10 20V4M16 20v-7M3 21h18" /></svg>Analysis</h2><dl className="divide-y divide-slate-100 px-5"><div className="flex items-center justify-between py-5 text-sm"><dt className="text-slate-500">Total child(ren)</dt><dd className="font-semibold text-blue-950">1</dd></div><div className="flex items-center justify-between py-5 text-sm"><dt className="text-slate-500">Available results</dt><dd className="font-semibold text-blue-950">{account.results.length}</dd></div></dl></section>
          </div> : <section className="max-w-3xl rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 p-6"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-sky-600"><UserIcon className="h-8 w-8" /></div><div><h2 className="break-words text-lg font-semibold text-blue-950">{guardianName}</h2><p className="mt-1 text-sm text-slate-500">Parent/Guardian</p></div></div>
            <dl className="grid gap-6 p-6 sm:grid-cols-2"><div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Pupil name</dt><dd className="mt-2 break-words text-sm font-medium">{account.pupil.name}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Pupil Reg No</dt><dd className="mt-2 break-all text-sm font-medium">{account.pupil.reg_no}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Relationship</dt><dd className="mt-2 text-sm font-medium">Parent/Guardian</dd></div>{currentClass && <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Class on latest result</dt><dd className="mt-2 text-sm font-medium">{currentClass}</dd></div>}</dl>
          </section>}
        </div>
      </div>
    </div>
  </main>;
}
