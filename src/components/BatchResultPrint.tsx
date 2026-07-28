"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AssessmentTemplate from "@/components/AssessmentTemplate";
import PrimaryAssessmentTemplate from "@/components/PrimaryAssessmentTemplate";
import PrimaryThirdTermTemplate from "@/components/PrimaryThirdTermTemplate";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import { canControlStaffAccess } from "@/lib/portalAdmins";
import type { AssessmentResult } from "@/types/assessment";

type SavedResult = {
  id: string;
  student_name: string;
  class_name: string;
  term: string;
  assessment_data?: unknown;
};

function parseAssessment(value: unknown): AssessmentResult | null {
  if (!value) return null;
  try {
    return (typeof value === "string" ? JSON.parse(value) : value) as AssessmentResult;
  } catch {
    return null;
  }
}

export default function BatchResultPrint({ className }: { className: string }) {
  const [supabase] = useState(() => getBrowserSupabase());
  const [results, setResults] = useState<SavedResult[] | null>(null);
  const [error, setError] = useState<string | null>(() => supabase ? null : "Supabase is unavailable.");

  useEffect(() => {
    let cancelled = false;
    if (!supabase) return;

    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!authData.user) {
        window.location.assign("/login");
        return;
      }
      if (!canControlStaffAccess(authData.user.email)) {
        setError("Only the main administrator can print all results for an arm.");
        return;
      }
      if (!className) {
        setError("Select a class arm from the Results Manager first.");
        return;
      }

      const { data, error: loadError } = await supabase
        .from("students")
        .select("id, student_name, class_name, term, assessment_data")
        .eq("class_name", className)
        .order("student_name", { ascending: true });
      if (cancelled) return;
      if (loadError) {
        setError(loadError.message);
        return;
      }
      setResults((data ?? []) as SavedResult[]);
    })();

    return () => {
      cancelled = true;
    };
  }, [className, supabase]);

  if (error) {
    return <main className="min-h-screen bg-slate-100 p-6"><div className="mx-auto max-w-3xl rounded-2xl bg-white p-6"><p className="text-red-700">{error}</p><Link href="/dashboard#results" className="mt-4 inline-block text-sky-700">Back to Results Manager</Link></div></main>;
  }
  if (!results) {
    return <main className="min-h-screen bg-slate-100 p-8 text-sm text-slate-600">Loading {className} results...</main>;
  }

  const printableResults = results
    .map((result) => ({ result, assessment: parseAssessment(result.assessment_data) }))
    .filter((item): item is { result: SavedResult; assessment: AssessmentResult } => Boolean(item.assessment));

  return (
    <main className="batch-print min-h-screen bg-slate-200">
      <div className="batch-print-toolbar no-print sticky top-0 z-50 flex flex-col gap-3 bg-slate-950 px-4 py-4 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold">{className} — Print All Results</h1>
          <p className="text-sm text-slate-300">{printableResults.length} printable result{printableResults.length === 1 ? "" : "s"}, ordered by pupil name.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard#results" className="rounded-xl border border-slate-500 px-4 py-2 text-sm font-semibold">Back</Link>
          <button type="button" onClick={() => window.print()} disabled={printableResults.length === 0} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold disabled:opacity-50">Print All</button>
        </div>
      </div>

      {printableResults.length === 0 ? (
        <p className="p-8 text-center text-slate-700">No printable result sheets were found for {className}.</p>
      ) : printableResults.map(({ result, assessment }) => {
        const sharedProps = {
          student_name: assessment.student_name || result.student_name,
          session: assessment.session ?? "",
          term: assessment.term || result.term,
          class_name: assessment.class_name || result.class_name,
          initialResult: assessment,
          readOnly: true,
          onSubmit: async () => {},
          onCancel: () => {},
        };

        return (
          <section key={result.id} className="batch-result">
            {assessment.section === "Nursery" ? (
              <AssessmentTemplate {...sharedProps} section="Nursery" />
            ) : assessment.term === "3rd Term" ? (
              <PrimaryThirdTermTemplate {...sharedProps} priorTermResults={{}} />
            ) : (
              <PrimaryAssessmentTemplate {...sharedProps} />
            )}
          </section>
        );
      })}
    </main>
  );
}
