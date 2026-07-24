"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import {
  PRIMARY_AFFECTIVE_TRAITS,
  PRIMARY_PSYCHOMOTOR_SKILLS,
  PRIMARY_SUBJECTS,
  type AssessmentResult,
  type PrimaryRating,
  type PrimarySubjectResult,
} from "@/types/assessment";
import { getPrimaryRemark } from "@/lib/primaryRemark";

type Props = {
  student_name: string;
  session: string;
  term: string;
  class_name: string;
  onSubmit: (result: AssessmentResult) => Promise<void>;
  onCancel: () => void;
  initialResult?: AssessmentResult;
  readOnly?: boolean;
  draftKey?: string;
  onEdit?: () => void;
  submitLabel?: string;
};

const emptySubjects = (): PrimarySubjectResult[] =>
  PRIMARY_SUBJECTS.map((subject) => ({ subject }));
const emptyRatings = (labels: readonly string[]): PrimaryRating[] =>
  labels.map((label) => ({ label }));

export default function PrimaryAssessmentTemplate({ student_name, session, term, class_name, onSubmit, onCancel, initialResult, readOnly = false, draftKey, onEdit, submitLabel = "Submit Result" }: Props) {
  const [subjects, setSubjects] = useState(() => initialResult?.primary_subjects?.length ? initialResult.primary_subjects : emptySubjects());
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [affectiveTraits, setAffectiveTraits] = useState(() => initialResult?.affective_traits?.length ? initialResult.affective_traits : emptyRatings(PRIMARY_AFFECTIVE_TRAITS));
  const [psychomotorSkills, setPsychomotorSkills] = useState(() => initialResult?.psychomotor_skills?.length ? initialResult.psychomotor_skills : emptyRatings(PRIMARY_PSYCHOMOTOR_SKILLS));
  const [info, setInfo] = useState({
    age: initialResult?.age ?? "", averageAge: initialResult?.average_age ?? "",
    session: initialResult?.session ?? session,
    numberInClass: initialResult?.number_in_class ?? "", position: initialResult?.position ?? "",
    weightStart: initialResult?.weight_start ?? "", weightEnd: initialResult?.weight_end ?? "",
    heightStart: initialResult?.height_start ?? "", heightEnd: initialResult?.height_end ?? "",
    teacher: initialResult?.class_teacher ?? "",
    daysOpened: initialResult?.days_school_opened?.toString() ?? "",
    daysAbsent: initialResult?.days_absent?.toString() ?? "",
    nextTermBegins: initialResult?.next_term_begins ?? "",
    classTeacherRemark: initialResult?.class_teacher_remarks ?? "",
    headTeacherRemark: initialResult?.head_teacher_remarks ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    if (readOnly || !draftKey) { setDraftReady(true); return; }
    try {
      const saved = window.localStorage.getItem(draftKey);
      if (saved) {
        const draft = JSON.parse(saved);
        if (Array.isArray(draft.subjects)) setSubjects(draft.subjects);
        if (Array.isArray(draft.affectiveTraits)) setAffectiveTraits(draft.affectiveTraits);
        if (Array.isArray(draft.psychomotorSkills)) setPsychomotorSkills(draft.psychomotorSkills);
        if (draft.info) setInfo(draft.info);
      }
    } catch {
      // Ignore an invalid draft and keep the clean template.
    }
    setDraftReady(true);
  }, [draftKey, readOnly]);

  useEffect(() => {
    if (!readOnly && draftKey && draftReady) {
      window.localStorage.setItem(draftKey, JSON.stringify({ subjects, affectiveTraits, psychomotorSkills, info }));
    }
  }, [subjects, affectiveTraits, psychomotorSkills, info, draftKey, draftReady, readOnly]);

  function cancel() {
    if (draftKey) window.localStorage.removeItem(draftKey);
    onCancel();
  }

  const totals = useMemo(() => subjects.map((row) => (row.cat ?? 0) + (row.exam ?? 0)), [subjects]);
  const grandTotal = totals.reduce((sum, value, index) => subjects[index].not_offered ? sum : sum + value, 0);
  const completedSubjects = subjects.filter((row) => !row.not_offered && (row.cat !== undefined || row.exam !== undefined)).length;
  const average = completedSubjects ? grandTotal / completedSubjects : 0;

  const setInfoValue = (key: keyof typeof info, value: string) => setInfo((old) => ({ ...old, [key]: value }));
  const updateSubject = (index: number, key: keyof PrimarySubjectResult, value: string) => {
    const draftId = `${index}:${String(key)}`;
    const currentRow = subjects[index];

    if (currentRow.not_offered) {
      if (value === "N/A") return;
      setScoreDrafts((old) => ({ ...old, [draftId]: "" }));
      setSubjects((old) => old.map((row, i) => i === index
        ? { ...row, not_offered: false, [key]: undefined }
        : row));
      return;
    }

    if ((key === "cat" || key === "exam") && value.trim().toUpperCase().startsWith("N")) {
      setScoreDrafts((old) => {
        const next = { ...old };
        Object.keys(next).filter((id) => id.startsWith(`${index}:`)).forEach((id) => delete next[id]);
        return next;
      });
      setSubjects((old) => old.map((row, i) => i === index
        ? { ...row, not_offered: true, cat: undefined, exam: undefined }
        : row));
      return;
    }

    if (!/^\d*\.?\d*$/.test(value)) return;
    setScoreDrafts((old) => ({ ...old, [draftId]: value }));
    setSubjects((old) => old.map((row, i) => {
      if (i !== index) return row;
      return { ...row, not_offered: false, [key]: value === "" || value === "." ? undefined : Number(value) };
    }));
  };
  const finishScoreEdit = (index: number, key: keyof PrimarySubjectResult) => {
    const draftId = `${index}:${String(key)}`;
    setScoreDrafts((old) => {
      const next = { ...old };
      delete next[draftId];
      return next;
    });
  };
  const updateRating = (kind: "affective" | "psychomotor", index: number, value: string) => {
    const setter = kind === "affective" ? setAffectiveTraits : setPsychomotorSkills;
    setter((old) => old.map((row, i) => i === index ? { ...row, rating: value === "" ? undefined : value as "A" | "B" | "C" } : row));
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await onSubmit({
        student_name, term, class_name, section: "Primary", assessments: [],
        session: info.session, age: info.age, average_age: info.averageAge,
        number_in_class: info.numberInClass, position: info.position,
        weight_start: info.weightStart, weight_end: info.weightEnd,
        height_start: info.heightStart, height_end: info.heightEnd,
        class_teacher: info.teacher, days_school_opened: Number(info.daysOpened),
        days_absent: Number(info.daysAbsent), next_term_begins: info.nextTermBegins,
        class_teacher_remarks: info.classTeacherRemark, head_teacher_remarks: info.headTeacherRemark,
        primary_subjects: subjects.map((row, index) => ({ ...row, total: row.not_offered ? undefined : totals[index], remark: row.not_offered ? "" : getPrimaryRemark(totals[index], row.cat !== undefined || row.exam !== undefined) })),
        affective_traits: affectiveTraits, psychomotor_skills: psychomotorSkills,
      });
      if (draftKey) window.localStorage.removeItem(draftKey);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to submit result.");
      setLoading(false);
    }
  }

  const lineInput = (key: keyof typeof info, label: string, className = "", locked = false) => (
    <label className={`flex min-w-0 items-end gap-1 whitespace-nowrap ${className}`}>
      <b>{label}</b><input value={info[key]} readOnly={locked} onChange={(e) => setInfoValue(key, e.target.value)} className="min-w-0 flex-1 border-0 border-b border-dotted border-black bg-transparent px-1 outline-none" />
    </label>
  );
  const scoreInput = (row: number, key: keyof PrimarySubjectResult, max?: number) => (
    <input type="text" inputMode="decimal" min={0} max={max} value={subjects[row].not_offered && (key === "cat" || key === "exam") ? "N/A" : scoreDrafts[`${row}:${String(key)}`] ?? subjects[row][key] as number | undefined ?? ""} onChange={(e) => updateSubject(row, key, e.target.value)} onBlur={() => finishScoreEdit(row, key)} className="h-full w-full bg-transparent px-1 text-center outline-none" />
  );

  return (
    <div className="result-entry-page primary-entry-page min-h-screen bg-slate-200 p-3 text-black sm:p-6">
      <form onSubmit={handleSubmit} className="mx-auto max-w-[1480px]">
        <div className={`primary-sheet primary-standard-sheet overflow-x-auto bg-white p-5 shadow-xl sm:p-8 ${readOnly ? "read-only-sheet" : ""}`}>
          <div className="min-w-[1180px] text-[15px] leading-tight">
            <header className="grid grid-cols-[130px_1fr_130px] items-center">
              <Image src="/school-logo-transparent.png" alt="Regal Tulip School logo" width={112} height={112} className="mx-auto object-contain" priority />
              <div className="text-center">
                <h1 className="text-[48px] font-black tracking-[0.02em]">REGAL TULIP SCHOOL, NKWELLE</h1>
                <h2 className="text-[29px] font-black">PUPIL&apos;S PROGRESS REPORT</h2>
              </div><div />
            </header>

            <div className="mt-5 grid grid-cols-[2.1fr_1fr_.9fr_1.25fr_1fr_1.2fr] gap-2">
              <label className="flex"><b>NAME:</b><span className="flex-1 border-b border-dotted border-black px-1">{student_name}</span></label>
              <label className="flex"><b>CLASS:</b><span className="flex-1 border-b border-dotted border-black px-1">{class_name}</span></label>
              {lineInput("age", "AGE:")}{lineInput("averageAge", "AVERAGE AGE:")}
              <label className="flex"><b>TERM:</b><span className="flex-1 border-b border-dotted border-black px-1">{term}</span></label>
              {lineInput("session", "SESSION:")}
            </div>
            <div className="my-5 grid grid-cols-[.85fr_.8fr_1.2fr_1.2fr_1.55fr] gap-3">
              {lineInput("numberInClass", "NO IN CLASS:", "", true)}{lineInput("position", "POSITION:", "", true)}
              <div className="flex gap-2"><b>WEIGHT:</b>{lineInput("weightStart", "W1 (kg)", "primary-short-line")}{lineInput("weightEnd", "W2 (kg)", "primary-short-line")}</div>
              <div className="flex gap-2"><b>HEIGHT:</b>{lineInput("heightStart", "H1 (cm)", "primary-short-line")}{lineInput("heightEnd", "H2 (cm)", "primary-short-line")}</div>
              {lineInput("teacher", "TEACHER:")}
            </div>

            <table className="w-full table-fixed border-collapse border-2 border-black">
              <colgroup><col className="w-[28%]" /><col className="w-[6.2%]" /><col className="w-[6.2%]" /><col className="w-[6.2%]" /><col className="w-[7%]" /><col className="w-[7%]" /><col className="w-[11.5%]" /><col className="w-[22.5%]" /><col className="w-[5.4%]" /></colgroup>
              <thead><tr className="h-16">
                <th className="border border-black text-xl">SUBJECT</th><th className="border border-black font-normal">CAT 40</th><th className="border border-black font-normal">EXAM<br />60</th><th className="border border-black font-normal">TOTAL<br />100</th><th className="border border-black font-normal">CLASS<br />HIGHEST<br />SCORE</th><th className="border border-black font-normal">CLASS<br />LOWEST<br />SCORE</th><th className="border border-black font-normal">REMARK</th><th className="border border-black px-4 text-left align-bottom">AFFECTIVE TRAITS</th><th className="border border-black" /></tr></thead>
              <tbody>{subjects.map((row, index) => {
                const affective = affectiveTraits[index];
                const psychomotorIndex = index - 13;
                const psychomotor = psychomotorSkills[psychomotorIndex];
                return <tr key={row.subject} className="h-7">
                  <td className="border border-black px-3 font-medium">{row.subject}</td><td className="border border-black">{scoreInput(index, "cat", 40)}</td><td className="border border-black">{scoreInput(index, "exam", 60)}</td><td className="border border-black text-center">{row.not_offered ? "N/A" : totals[index] || ""}</td><td className="border border-black">{scoreInput(index, "class_highest_score", 100)}</td><td className="border border-black">{scoreInput(index, "class_lowest_score", 100)}</td><td className="border border-black px-1 text-center text-[12px] font-semibold">{row.not_offered ? "N/A" : getPrimaryRemark(totals[index], row.cat !== undefined || row.exam !== undefined)}</td>
                  <td className={`border border-black px-4 ${index === 12 ? "font-bold" : ""}`}>{index === 11 ? "" : index === 12 ? "PSYCHOMOTOR SKILLS" : affective?.label ?? psychomotor?.label ?? ""}</td>
                  <td className="border border-black">{affective ? <select aria-label={`${affective.label} rating`} value={affective.rating ?? ""} onChange={(e) => updateRating("affective", index, e.target.value)} className="rating-select h-full w-full bg-transparent text-center outline-none"><option value="" /><option>A</option><option>B</option><option>C</option></select> : psychomotor ? <select aria-label={`${psychomotor.label} rating`} value={psychomotor.rating ?? ""} onChange={(e) => updateRating("psychomotor", psychomotorIndex, e.target.value)} className="rating-select h-full w-full bg-transparent text-center outline-none"><option value="" /><option>A</option><option>B</option><option>C</option></select> : null}</td>
                </tr>;
              })}
              <tr className="h-8 font-bold"><td className="border border-black px-3">TOTAL</td><td className="border border-black" /><td className="border border-black" /><td className="border border-black text-center">{grandTotal || ""}</td>{[0,1,2,3,4].map((n) => <td key={n} className="border border-black" />)}</tr>
              <tr className="h-8 font-bold"><td className="border border-black px-3">AVERAGE</td><td className="border border-black" /><td className="border border-black" /><td className="border border-black text-center">{average ? average.toFixed(1) : ""}</td>{[0,1,2,3,4].map((n) => <td key={n} className="border border-black" />)}</tr></tbody>
            </table>

            <div className="mt-5 grid grid-cols-[1fr_2.4fr_1.45fr] gap-x-5 gap-y-4">
              {lineInput("daysOpened", "Number of times school opened:")}{lineInput("classTeacherRemark", "Class Teacher's Remark:")}
              <div className="grid grid-cols-2 gap-x-5 font-bold"><span>RATING KEY</span><span>H1: &nbsp;BEGINNING OF TERM</span></div>
              {lineInput("daysAbsent", "Number of times absent:")}<div className="border-b border-black" />
              <div className="grid grid-cols-2 gap-x-5 font-bold"><span>A: &nbsp;EXCELLENT</span><span>H2: &nbsp;END OF TERM</span></div>
              {lineInput("nextTermBegins", "Next Term Begins:")}{lineInput("headTeacherRemark", "Head Teacher's Remark:")}
              <div className="grid grid-cols-2 gap-x-5 font-bold"><span>B: &nbsp;GOOD</span><span>W1: &nbsp;BEGINNING OF TERM</span></div>
              <div /><div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2"><span className="border-b border-black" /><span>Signature:</span><span className="border-b border-black" /></div>
              <div className="grid grid-cols-2 gap-x-5 font-bold"><span>C: &nbsp;AVERAGE</span><span>W2: &nbsp;END OF TERM</span></div>
            </div>
          </div>
        </div>
        {message && <p className="no-print mt-3 rounded bg-red-50 p-3 text-sm text-red-700">{message}</p>}
        <div className="no-print mt-4 grid gap-3 sm:flex sm:flex-wrap sm:justify-end">
          <button type="button" onClick={cancel} className="min-h-11 rounded-lg border border-slate-400 bg-white px-6 py-3 font-semibold">{readOnly ? "Back to Results" : "Cancel"}</button>
          <button type="button" onClick={() => window.print()} className="min-h-11 rounded-lg bg-emerald-700 px-7 py-3 font-semibold text-white">Print Result</button>
          {readOnly && onEdit && <button type="button" onClick={onEdit} className="min-h-11 rounded-lg bg-sky-700 px-7 py-3 font-semibold text-white">Edit Result</button>}
          {!readOnly && <button type="submit" disabled={loading} className="min-h-11 rounded-lg bg-sky-700 px-7 py-3 font-semibold text-white disabled:opacity-60">{loading ? "Saving..." : submitLabel}</button>}
        </div>
      </form>
    </div>
  );
}
