"use client";

import { useState } from "react";
import type { AssessmentResult } from "@/types/assessment";
import { resultSession } from "@/lib/resultFilters";

type Report = { id: string; class_name: string; term: string; average_score: number; assessment_data: AssessmentResult | string | null };
const terms = ["1st Term", "2nd Term", "3rd Term"];

export default function GuardianResultTable({ reports, onSelectResult, onBack }: { reports: Report[]; onSelectResult: (report: Report) => void; onBack: () => void }) {
  const [search, setSearch] = useState("");
  const groups = new Map<string, { className: string; session: string; reports: Map<string, Report> }>();
  for (const report of reports) {
    const session = resultSession(report) || "Not recorded";
    const key = JSON.stringify([report.class_name, session]);
    if (!groups.has(key)) groups.set(key, { className: report.class_name, session, reports: new Map() });
    const group = groups.get(key)!;
    // Reports arrive newest first. Keep the latest available report per term.
    if (!group.reports.has(report.term)) group.reports.set(report.term, report);
  }
  const rows = Array.from(groups.values()).filter(row => `${row.className} ${row.session}`.toLowerCase().includes(search.trim().toLowerCase()));

  return <section className="min-w-0 rounded-lg border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold uppercase text-blue-950">Your child&apos;s results</h2><button type="button" onClick={onBack} className="min-h-11 rounded-lg px-3 text-sm font-medium text-sky-700 hover:bg-sky-50">&larr; Back</button></div>
    <div className="p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p role="status" className="text-sm text-slate-500">{rows.length} class/session record{rows.length === 1 ? "" : "s"}</p><label className="flex items-center gap-3 text-sm font-medium">Search:<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Class or session" className="min-h-11 w-full min-w-0 rounded-md border border-slate-300 px-3 outline-none focus:border-sky-500 sm:w-56" /></label></div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <caption className="sr-only">Results grouped by class and academic session, with a separate button for each available term.</caption>
          <thead className="bg-slate-50"><tr>{["Class", "Session", "First Term", "Second Term", "Third Term"].map(label => <th key={label} scope="col" className="border-b border-slate-200 px-4 py-4 text-left font-semibold text-slate-600">{label}</th>)}</tr></thead>
          <tbody>{rows.map(row => <tr key={JSON.stringify([row.className, row.session])} className="border-b border-slate-100 last:border-0 odd:bg-white even:bg-slate-50"><th scope="row" className="px-4 py-5 text-left font-medium text-blue-950">{row.className}</th><td className="whitespace-nowrap px-4 py-5">{row.session}</td>{terms.map((term, index) => { const report = row.reports.get(term); return <td key={term} className="px-3 py-4">{report?.assessment_data ? <button type="button" onClick={() => onSelectResult(report)} aria-label={`View ${["First", "Second", "Third"][index]} Term result for ${row.className}, ${row.session}`} className="min-h-11 w-full whitespace-nowrap rounded-md bg-emerald-600 px-5 py-2 font-medium text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">View Result</button> : <span className="block text-center text-xs text-slate-400">Not available</span>}</td>; })}</tr>)}{!rows.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">{reports.length ? "No results match your search." : "No results have been uploaded for your child yet."}</td></tr>}</tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500 sm:hidden">Swipe the table sideways to see all three terms.</p>
    </div>
  </section>;
}
