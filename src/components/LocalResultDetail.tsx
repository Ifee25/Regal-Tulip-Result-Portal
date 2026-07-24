"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PrintButton from "@/components/PrintButton";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import AssessmentTemplate from "@/components/AssessmentTemplate";
import PrimaryAssessmentTemplate from "@/components/PrimaryAssessmentTemplate";
import PrimaryThirdTermTemplate from "@/components/PrimaryThirdTermTemplate";
import type { AssessmentResult } from "@/types/assessment";
import { isPortalAdmin } from "@/lib/portalAdmins";

type LocalResult = {
  id: string;
  student_name: string;
  class_name: string;
  term: string;
  average_score: number;
  assessment_data?: unknown;
  created_at?: string;
  uploaded_by?: string;
  uploaded_by_email?: string;
};


function parseAssessment(value: unknown): AssessmentResult | null {
  if (!value) return null;
  try {
    return (typeof value === "string" ? JSON.parse(value) : value) as AssessmentResult;
  } catch {
    return null;
  }
}

export default function LocalResultDetail({ id, startInEditMode = false }: { id: string; startInEditMode?: boolean }) {
  const [result, setResult] = useState<LocalResult | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let cachedResult: LocalResult | null = null;
    const supabase = getBrowserSupabase();

    void (async () => {
      if (!supabase) {
        setResult(null);
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      if (cancelled) return;
      const currentUser = authData.user;
      if (!currentUser) {
        window.location.assign("/login");
        return;
      }

      try {
        const saved = window.localStorage.getItem(`regal-tulip-result:${id}`)
          ?? window.localStorage.getItem(`regal-tulip-review:${id}`);
        const parsed = saved ? JSON.parse(saved) as LocalResult : null;
        const isAdmin = isPortalAdmin(currentUser.email);
        const isOwner = parsed?.uploaded_by === currentUser.id
          || Boolean(parsed?.uploaded_by_email && parsed.uploaded_by_email.toLowerCase() === currentUser.email?.toLowerCase());
        setCanEdit(isAdmin || isOwner);
        if (startInEditMode && (isAdmin || isOwner)) setEditing(true);
        cachedResult = parsed && (isAdmin || isOwner) ? parsed : null;
        setResult(cachedResult);
      } catch {
        setResult(null);
      }

      if (!id.startsWith("local-")) {
        void supabase
          .from("students")
          .select("id, student_name, class_name, term, average_score, assessment_data, created_at, uploaded_by, uploaded_by_email")
          .eq("id", id)
          .single()
          .then(({ data, error }) => {
            if (cancelled) return;
            if (data && !error) {
              const remoteResult = data as LocalResult;
              const isOwner = remoteResult.uploaded_by === currentUser.id
                || Boolean(remoteResult.uploaded_by_email && remoteResult.uploaded_by_email.toLowerCase() === currentUser.email?.toLowerCase());
              setCanEdit(isPortalAdmin(currentUser.email) || isOwner);
              if (startInEditMode && (isPortalAdmin(currentUser.email) || isOwner)) setEditing(true);
              setResult(remoteResult);
              try {
                window.localStorage.setItem(`regal-tulip-review:${id}`, JSON.stringify(remoteResult));
              } catch {
                // Review caching is optional.
              }
            } else if (!cachedResult) {
              setResult(null);
            }
          });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, startInEditMode]);

  if (result === undefined) {
    return <main className="min-h-screen p-8 text-sm text-slate-600">Loading result...</main>;
  }
  if (!result) {
    return <main className="min-h-screen p-4 sm:p-8"><div className="mx-auto max-w-3xl"><p className="text-sm text-red-600">Result not found.</p><Link href="/dashboard#results" className="mt-4 inline-block text-sm text-sky-700">Back to Result Manager</Link></div></main>;
  }

  const assessment = parseAssessment(result.assessment_data);
  if (assessment) {
    const saveResult = async (updatedAssessment: AssessmentResult) => {
      if (!canEdit) throw new Error("You do not have permission to edit this result.");
      const totals = (updatedAssessment.primary_subjects ?? [])
        .filter((subject) => !subject.not_offered && subject.total !== undefined)
        .map((subject) => subject.total as number);
      let updated: LocalResult = {
        ...result,
        average_score: updatedAssessment.section === "Primary" && totals.length
          ? Number((totals.reduce((sum, score) => sum + score, 0) / totals.length).toFixed(2))
          : 0,
        assessment_data: updatedAssessment,
      };

      if (id.startsWith("local-")) {
        window.localStorage.setItem(`regal-tulip-result:${id}`, JSON.stringify(updated));
      } else {
        const supabase = getBrowserSupabase();
        if (!supabase) throw new Error("The database is unavailable. Please try again.");
        const { error } = await supabase.from("students").update({
          average_score: updated.average_score,
          assessment_data: updated.assessment_data,
        }).eq("id", id);
        if (error) throw new Error(error.message);
        const { data: refreshed } = await supabase
          .from("students")
          .select("id, student_name, class_name, term, average_score, assessment_data, created_at, uploaded_by, uploaded_by_email")
          .eq("id", id)
          .single();
        if (refreshed) updated = refreshed as LocalResult;
        window.localStorage.setItem(`regal-tulip-review:${id}`, JSON.stringify(updated));
      }
      setResult(updated);
      setEditing(false);
    };
    const sharedProps = {
      student_name: assessment.student_name || result.student_name,
      session: assessment.session ?? "",
      term: assessment.term || result.term,
      class_name: assessment.class_name || result.class_name,
      initialResult: assessment,
      readOnly: !editing,
      onEdit: canEdit ? () => setEditing(true) : undefined,
      submitLabel: "Save Changes",
      onSubmit: saveResult,
      onCancel: () => editing ? setEditing(false) : window.location.assign("/dashboard#results"),
    };

    if (assessment.section === "Nursery") {
      return <AssessmentTemplate {...sharedProps} section="Nursery" />;
    }
    if (assessment.term === "3rd Term") {
      return <PrimaryThirdTermTemplate {...sharedProps} priorTermResults={{}} />;
    }
    return <PrimaryAssessmentTemplate {...sharedProps} />;
  }

  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-6 flex items-center justify-between"><Link href="/dashboard#results" className="text-sm text-slate-600">← Back to Result Manager</Link><PrintButton /></div>
      <section className="rounded border bg-white p-6">
        <h1 className="text-2xl font-bold">{result.student_name}</h1>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-700">
          <div><div className="text-xs text-slate-500">Class</div><div className="font-medium">{result.class_name}</div></div>
          <div><div className="text-xs text-slate-500">Term</div><div className="font-medium">{result.term}</div></div>
          {!result.class_name.startsWith("Nursery") && <div><div className="text-xs text-slate-500">Average</div><div className="font-medium text-sky-600">{result.average_score}%</div></div>}
          <div><div className="text-xs text-slate-500">Recorded</div><div className="font-medium">{result.created_at ?? "-"}</div></div>
        </div>
        {id.startsWith("local-") && <p className="mt-6 rounded bg-amber-50 p-3 text-sm text-amber-800">This result is stored locally because the database connection was unavailable during upload.</p>}
      </section>
    </div>
  </main>;
}
