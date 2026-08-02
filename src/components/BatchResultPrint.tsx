"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AssessmentTemplate from "@/components/AssessmentTemplate";
import PrimaryAssessmentTemplate from "@/components/PrimaryAssessmentTemplate";
import PrimaryThirdTermTemplate from "@/components/PrimaryThirdTermTemplate";
import type { AssessmentResult } from "@/types/assessment";

type BatchRow = {
  id: string;
  student_name: string;
  class_name: string;
  term: string;
  assessment_data?: unknown;
};

function parseAssessment(value: unknown): AssessmentResult | null {
  try {
    return (typeof value === "string" ? JSON.parse(value) : value) as AssessmentResult | null;
  } catch {
    return null;
  }
}

export default function BatchResultPrint({ className }: { className: string }) {
  const [rows, setRows] = useState<BatchRow[] | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const cached = JSON.parse(window.localStorage.getItem("regal-tulip-print-batch") ?? "[]") as BatchRow[];
        setRows(cached.filter((row) => row.class_name === className));
      } catch {
        setRows([]);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [className]);

  if (rows === null) return <main className="p-8 text-sm text-slate-600">Preparing class results…</main>;

  const printableRows = rows
    .map((row) => ({ row, assessment: parseAssessment(row.assessment_data) }))
    .filter((entry): entry is { row: BatchRow; assessment: AssessmentResult } => Boolean(entry.assessment));

  return (
    <main className="batch-print-page min-h-screen bg-slate-200">
      <div className="no-print sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 bg-slate-950 px-4 py-3 text-white shadow-lg">
        <div>
          <h1 className="font-semibold">Print all results — {className}</h1>
          <p className="text-sm text-slate-300">{printableRows.length} result sheet{printableRows.length === 1 ? "" : "s"} ready.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard?className=${encodeURIComponent(className)}#results`} className="rounded-lg border border-slate-500 px-4 py-2 text-sm font-semibold">Back</Link>
          <button type="button" disabled={!printableRows.length} onClick={() => window.print()} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold disabled:opacity-50">Print all</button>
        </div>
      </div>

      {!printableRows.length && <p className="no-print mx-auto mt-8 max-w-xl rounded-xl bg-white p-5 text-center text-slate-700">No complete result sheets were found for this arm. Return to the Result Manager and select Print all again.</p>}

      {printableRows.map(({ row, assessment }) => {
        const common = {
          student_name: assessment.student_name || row.student_name,
          session: assessment.session ?? "",
          term: assessment.term || row.term,
          class_name: assessment.class_name || row.class_name,
          initialResult: assessment,
          readOnly: true,
          onSubmit: async () => {},
          onCancel: () => {},
        };
        return (
          <section key={row.id} className={`batch-result ${assessment.section === "Nursery" ? "batch-nursery-result" : "batch-primary-result"}`}>
            {assessment.section === "Nursery"
              ? <AssessmentTemplate {...common} section="Nursery" />
              : assessment.term === "3rd Term"
                ? <PrimaryThirdTermTemplate {...common} priorTermResults={{}} />
                : <PrimaryAssessmentTemplate {...common} />}
          </section>
        );
      })}

      <style jsx global>{`
        @media print {
          /*
           * A single Primary result uses a fixed-height, overflow-hidden form.
           * During batch pagination Chromium clips every fragmented form except
           * the last one. Let the scaled sheet remain visible and paginate the
           * complete Primary page itself instead of fragmenting its wrapper.
           */
          .batch-primary-result .primary-entry-page,
          .batch-primary-result .primary-entry-page form {
            overflow: visible !important;
          }
          .batch-primary-result .primary-entry-page {
            break-after: page;
            page-break-after: always;
          }
          .batch-primary-result:last-child .primary-entry-page {
            break-after: auto;
            page-break-after: auto;
          }
          .batch-nursery-result {
            break-after: page;
            page-break-after: always;
          }
          .batch-nursery-result:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }
      `}</style>
    </main>
  );
}
