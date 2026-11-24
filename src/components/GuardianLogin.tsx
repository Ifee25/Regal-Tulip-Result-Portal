"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";

type Props = {
  phone: string;
  reg: string;
  busy: boolean;
  message: string;
  onPhoneChange: (value: string) => void;
  onRegChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

function LockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>;
}

export default function GuardianLogin({ phone, reg, busy, message, onPhoneChange, onRegChange, onSubmit }: Props) {
  const [helpOpen, setHelpOpen] = useState(false);
  const fieldClass = "mt-2 min-h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base text-blue-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 disabled:opacity-60";

  return <main className="min-h-screen bg-[linear-gradient(135deg,#f8fbff_0%,#eef6ff_48%,#f8fafc_100%)] text-blue-950 selection:bg-sky-200">
    <div className="mx-auto max-w-[1440px] px-5 py-5 sm:px-8 sm:py-7 lg:px-12">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white"><Image src="/school-logo-transparent.png" alt="" width={36} height={36} priority /></div>
          <div><p className="text-sm font-semibold tracking-tight sm:text-base">Regal Tulip School</p><p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 sm:text-xs">Parent &amp; Guardian Portal</p></div>
        </Link>
        <Link href="/" className="shrink-0 rounded-lg px-2 py-3 text-sm font-medium text-slate-600 transition hover:text-blue-950 focus-visible:outline-2 focus-visible:outline-sky-600"><span aria-hidden="true">&larr; </span><span className="hidden sm:inline">Back to </span>Home</Link>
      </header>

      <div className="my-8 grid overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-blue-950/10 sm:my-10 lg:min-h-[690px] lg:grid-cols-[1.05fr_1fr]">
        <section className="relative isolate overflow-hidden bg-blue-950 px-7 py-10 text-white sm:px-10 sm:py-12 lg:flex lg:flex-col lg:justify-between lg:p-14">
          <div aria-hidden="true" className="pointer-events-none absolute -right-44 -top-52 -z-10 h-[560px] w-[560px] rounded-full border border-white/[0.07]" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-80 -left-36 -z-10 h-[650px] w-[650px] rounded-full border-[90px] border-white/[0.025]" />
          <div>
            <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-sky-200"><span className="h-px w-7 bg-amber-400" />A partnership in learning</p>
            <h1 className="mt-7 max-w-md font-serif text-[38px] leading-[1.12] tracking-tight sm:text-5xl lg:text-[58px]">Every step forward.<br /><span className="text-sky-200">Every reason<br className="hidden lg:block" /> to be proud.</span></h1>
            <p className="mt-6 max-w-sm text-sm leading-7 text-slate-200 sm:text-base">Stay close to your child&apos;s learning journey. View their results, celebrate their progress, and prepare for what comes next.</p>
          </div>

          <div className="mt-10 hidden sm:block lg:mt-12" aria-hidden="true">
            <div className="max-w-sm rounded-2xl border border-white/15 bg-white/[0.05] p-5">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300/20 bg-sky-300/10 text-sky-200"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h5" /></svg></div><div><p className="text-sm font-medium">A clearer view of their progress</p><p className="mt-1 text-xs text-sky-100">Term results, thoughtfully brought together</p></div></div>
              <div className="mt-5 grid grid-cols-3 gap-2">{["Discover", "Encourage", "Celebrate"].map((word, index) => <div key={word} className="border-t border-white/15 pt-3"><p className="font-serif text-lg text-sky-200">0{index + 1}</p><p className="mt-1 text-xs text-slate-200">{word}</p></div>)}</div>
            </div>
          </div>
          <p className="mt-8 flex items-center gap-2 text-xs tracking-wide text-sky-100"><LockIcon />Private access to your child&apos;s results</p>
        </section>

        <section className="px-6 py-9 sm:px-12 sm:py-12 lg:flex lg:items-center lg:px-14">
          <div className="mx-auto w-full max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-600">Welcome to your parent portal</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A little closer to<br className="hidden sm:block" /> their school day.</h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">Sign in with the details provided when your child was registered.</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5" aria-busy={busy}>
              <div><label htmlFor="guardian-number" className="text-sm font-semibold">Guardian Number</label><input id="guardian-number" name="guardian_number" type="tel" autoComplete="tel" required maxLength={50} disabled={busy} value={phone} onChange={event => onPhoneChange(event.target.value)} placeholder="Enter your registered phone number" aria-describedby="guardian-number-hint" className={fieldClass} /><p id="guardian-number-hint" className="mt-2 text-xs leading-5 text-slate-500">The guardian phone number on your child&apos;s registration.</p></div>
              <div><label htmlFor="guardian-reg" className="text-sm font-semibold">Child&apos;s Reg No</label><input id="guardian-reg" name="reg_no" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={100} disabled={busy} value={reg} onChange={event => onRegChange(event.target.value)} placeholder="Enter your child's registration number" className={fieldClass} /></div>
              {message && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">{message}</p>}
              <button type="submit" disabled={busy} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-blue-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600 disabled:cursor-wait disabled:opacity-60">{busy ? <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none" />Please wait...</> : <>View my child&apos;s results <span aria-hidden="true">&rarr;</span></>}</button>
            </form>

            <div className="mt-7 border-t border-slate-200 pt-5">
              <button type="button" onClick={() => setHelpOpen(!helpOpen)} aria-expanded={helpOpen} aria-controls="guardian-login-help" className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left text-sm font-medium text-slate-600 hover:text-blue-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600">Need help signing in?<span aria-hidden="true" className="text-xl font-normal text-sky-600">{helpOpen ? "−" : "+"}</span></button>
              {helpOpen && <div id="guardian-login-help" className="mt-2 rounded-xl bg-[#f7f9fc] p-4 text-sm leading-6 text-slate-600">Use your registered guardian phone number and your child&apos;s Reg No. For siblings, sign in with each child&apos;s own Reg No. If you don&apos;t have these details, please contact the school office.</div>}
            </div>
          </div>
        </section>
      </div>
      <footer className="flex flex-col items-center justify-between gap-3 pb-3 text-center text-xs text-slate-500 sm:flex-row sm:text-left"><p>Regal Tulip School <span aria-hidden="true" className="mx-2 text-sky-500">&middot;</span> Growing together, every term.</p><p className="flex items-center gap-2"><LockIcon className="h-3.5 w-3.5" />For parents and guardians</p></footer>
    </div>
  </main>;
}
