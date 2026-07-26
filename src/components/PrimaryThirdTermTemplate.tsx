"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import {
  PRIMARY_AFFECTIVE_TRAITS, PRIMARY_PSYCHOMOTOR_SKILLS, PRIMARY_THIRD_TERM_SUBJECTS,
  type AssessmentResult, type PrimaryRating, type PrimarySubjectResult,
} from "@/types/assessment";
import { getPrimaryRemark } from "@/lib/primaryRemark";

type Props = { student_name: string; session: string; term: string; class_name: string; priorTermResults: { first?: AssessmentResult; second?: AssessmentResult }; onSubmit: (result: AssessmentResult) => Promise<void>; onCancel: () => void; initialResult?: AssessmentResult; readOnly?: boolean; draftKey?: string; onEdit?: () => void; submitLabel?: string };
type Info = { age: string; averageAge: string; session: string; numberInClass: string; position: string; weightStart: string; weightEnd: string; heightStart: string; heightEnd: string; teacher: string; daysOpened: string; daysAbsent: string; nextTermBegins: string; classTeacherRemark: string; headTeacherRemark: string };

const makeSubjects = (prior: Props["priorTermResults"]): PrimarySubjectResult[] => PRIMARY_THIRD_TERM_SUBJECTS.map((subject, index) => ({
  subject,
  first_term_score: prior.first?.primary_subjects?.[index]?.total,
  second_term_score: prior.second?.primary_subjects?.[index]?.total,
  not_offered: prior.first?.primary_subjects?.[index]?.not_offered || prior.second?.primary_subjects?.[index]?.not_offered,
}));
const makeRatings = (labels: readonly string[]): PrimaryRating[] => labels.map((label) => ({ label }));
export default function PrimaryThirdTermTemplate({ student_name, session, term, class_name, priorTermResults, onSubmit, onCancel, initialResult, readOnly = false, draftKey, onEdit, submitLabel = "Submit Result" }: Props) {
  const previousDetails = priorTermResults.second ?? priorTermResults.first;
  const [subjects, setSubjects] = useState(() => initialResult?.primary_subjects?.length ? initialResult.primary_subjects : makeSubjects(priorTermResults));
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [affective, setAffective] = useState(() => initialResult?.affective_traits?.length ? initialResult.affective_traits : makeRatings(PRIMARY_AFFECTIVE_TRAITS));
  const [psychomotor, setPsychomotor] = useState(() => initialResult?.psychomotor_skills?.length ? initialResult.psychomotor_skills : makeRatings(PRIMARY_PSYCHOMOTOR_SKILLS));
  const [info, setInfo] = useState<Info>({
    age: initialResult?.age ?? previousDetails?.age ?? "",
    averageAge: initialResult?.average_age ?? previousDetails?.average_age ?? "",
    session: initialResult?.session ?? (session || previousDetails?.session || ""),
    numberInClass: initialResult?.number_in_class ?? previousDetails?.number_in_class ?? "",
    position: initialResult?.position ?? "", weightStart: initialResult?.weight_start ?? "",
    weightEnd: initialResult?.weight_end ?? "", heightStart: initialResult?.height_start ?? "",
    heightEnd: initialResult?.height_end ?? "",
    teacher: initialResult?.class_teacher ?? previousDetails?.class_teacher ?? "",
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
        if (Array.isArray(draft.affective)) setAffective(draft.affective);
        if (Array.isArray(draft.psychomotor)) setPsychomotor(draft.psychomotor);
        if (draft.info) setInfo(draft.info);
      }
    } catch {
      // Ignore an invalid draft and keep the clean template.
    }
    setDraftReady(true);
  }, [draftKey, readOnly]);

  useEffect(() => {
    if (!readOnly && draftKey && draftReady) {
      window.localStorage.setItem(draftKey, JSON.stringify({ subjects, affective, psychomotor, info }));
    }
  }, [subjects, affective, psychomotor, info, draftKey, draftReady, readOnly]);

  function cancel() {
    if (draftKey) window.localStorage.removeItem(draftKey);
    onCancel();
  }

  const calculated = useMemo(() => subjects.map((row) => {
    if (row.not_offered) return { total: 0, annualTotal: 0, annualAverage: 0, termsEntered: 0 };
    const total = (row.cat ?? 0) + (row.exam ?? 0);
    const hasThirdTermScore = row.cat !== undefined || row.exam !== undefined;
    const termScores = [
      row.first_term_score,
      row.second_term_score,
      hasThirdTermScore ? total : undefined,
    ].filter((value): value is number => value !== undefined);
    const annualTotal = termScores.reduce((sum, value) => sum + value, 0);
    return {
      total,
      annualTotal,
      annualAverage: termScores.length ? annualTotal / termScores.length : 0,
      termsEntered: termScores.length,
    };
  }), [subjects]);
  const entered = subjects.filter((row) => !row.not_offered && (row.cat !== undefined || row.exam !== undefined)).length;
  const grandTotal = calculated.reduce((sum, row, index) => subjects[index].not_offered ? sum : sum + row.total, 0);
  const average = entered ? grandTotal / entered : 0;
  const grandAnnualTotal = calculated.reduce((sum, row, index) => subjects[index].not_offered ? sum : sum + row.annualTotal, 0);
  const annualTermEntries = calculated.reduce((sum, row, index) => subjects[index].not_offered ? sum : sum + row.termsEntered, 0);
  const annualTotalAverage = annualTermEntries ? grandAnnualTotal / annualTermEntries : 0;

  const setInfoValue = (key: keyof Info, value: string) => setInfo((old) => ({ ...old, [key]: value }));
  const updateSubject = (index: number, key: keyof PrimarySubjectResult, value: string) => {
    const draftId = `${index}:${String(key)}`;
    if (subjects[index].not_offered) {
      if (value === "N/A") return;
      setScoreDrafts((old) => ({ ...old, [draftId]: "" }));
      setSubjects((old) => old.map((row, i) => i === index ? { ...row, not_offered: false, [key]: undefined } : row));
      return;
    }
    if (value.trim().toUpperCase().startsWith("N")) {
      setScoreDrafts((old) => {
        const next = { ...old };
        Object.keys(next).filter((id) => id.startsWith(`${index}:`)).forEach((id) => delete next[id]);
        return next;
      });
      setSubjects((old) => old.map((row, i) => i === index ? { ...row, not_offered: true, cat: undefined, exam: undefined } : row));
      return;
    }
    if (!/^\d*\.?\d*$/.test(value)) return;
    setScoreDrafts((old) => ({ ...old, [draftId]: value }));
    setSubjects((old) => old.map((row, i) => i === index
      ? { ...row, not_offered: false, [key]: value === "" || value === "." ? undefined : Number(value) }
      : row));
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
    const setter = kind === "affective" ? setAffective : setPsychomotor;
    setter((old) => old.map((row, i) => i === index ? { ...row, rating: value === "" ? undefined : value as PrimaryRating["rating"] } : row));
  };
  const line = (key: keyof Info, label: string, className = "", locked = false) => <label className={`flex min-w-0 items-end gap-1 whitespace-nowrap ${className}`}><b>{label}</b><input value={info[key]} readOnly={locked} onChange={(e) => setInfoValue(key, e.target.value)} className="min-w-0 flex-1 border-0 border-b border-black bg-transparent px-1 outline-none" /></label>;
  const score = (index: number, key: keyof PrimarySubjectResult, max = 100) => <input type="text" inputMode="decimal" value={subjects[index].not_offered ? "N/A" : scoreDrafts[`${index}:${String(key)}`] ?? subjects[index][key] as number | undefined ?? ""} onChange={(e) => updateSubject(index, key, e.target.value)} onBlur={() => finishScoreEdit(index, key)} className="h-full w-full bg-transparent px-0.5 text-center outline-none" aria-label={`${subjects[index].subject} ${String(key)}`} data-max={max} />;

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage(null);
    try {
      await onSubmit({ student_name, term, class_name, section: "Primary", assessments: [], session: info.session, age: info.age, average_age: info.averageAge, number_in_class: info.numberInClass, position: info.position, weight_start: info.weightStart, weight_end: info.weightEnd, height_start: info.heightStart, height_end: info.heightEnd, class_teacher: info.teacher, days_school_opened: Number(info.daysOpened), days_absent: Number(info.daysAbsent), next_term_begins: info.nextTermBegins, class_teacher_remarks: info.classTeacherRemark, head_teacher_remarks: info.headTeacherRemark, primary_subjects: subjects.map((row, i) => ({ ...row, total: row.not_offered ? undefined : calculated[i].total, third_term_score: row.not_offered ? undefined : calculated[i].total, annual_total: row.not_offered ? undefined : calculated[i].annualTotal, annual_average: row.not_offered ? undefined : calculated[i].annualAverage, remark: row.not_offered ? "" : getPrimaryRemark(calculated[i].total, row.cat !== undefined || row.exam !== undefined) })), affective_traits: affective, psychomotor_skills: psychomotor });
      if (draftKey) window.localStorage.removeItem(draftKey);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Failed to submit result."); setLoading(false); }
  }

  return <div className="result-entry-page primary-entry-page min-h-screen bg-slate-200 p-3 text-black sm:p-6">
    <form onSubmit={submit} className="mx-auto max-w-[1500px]">
      <div className={`primary-sheet primary-annual-sheet overflow-x-auto bg-white p-6 shadow-xl sm:p-9 ${readOnly ? "read-only-sheet" : ""}`}><div className="min-w-[1320px] text-[14px] font-medium leading-tight">
        <header className="grid grid-cols-[150px_1fr_150px] items-center"><Image src="/school-logo-transparent.png" alt="Regal Tulip School logo" width={118} height={118} className="mx-auto object-contain" priority /><div className="text-center"><h1 className="text-[39px] font-black">REGAL TULIP SCHOOL, NKWELLE EZUNAKA.</h1><h2 className="mt-4 text-[31px] font-black">PUPIL&apos;S PROGRESS REPORT</h2></div><div /></header>
        <div className="mt-7 grid grid-cols-[2.3fr_1.15fr_1fr_1.2fr_1fr_1.35fr] gap-3"><label className="flex"><b>NAME:</b><span className="flex-1 border-b border-black px-1">{student_name}</span></label><label className="flex"><b>CLASS:</b><span className="flex-1 border-b border-black px-1">{class_name}</span></label>{line("age", "AGE:")}{line("averageAge", "AVERAGE AGE:")}<label className="flex"><b>TERM:</b><span className="flex-1 border-b border-black px-1">{term}</span></label>{line("session", "SESSION:")}</div>
        <div className="my-6 grid grid-cols-[.85fr_.8fr_1.2fr_1.2fr_1.55fr] gap-3">{line("numberInClass", "NO IN CLASS:", "", true)}{line("position", "POSITION:", "", true)}<div className="flex gap-2"><b>WEIGHT:</b>{line("weightStart", "W1 (kg)", "primary-short-line")}{line("weightEnd", "W2 (kg)", "primary-short-line")}</div><div className="flex gap-2"><b>HEIGHT:</b>{line("heightStart", "H1 (cm):", "primary-short-line")}{line("heightEnd", "H2 (cm):", "primary-short-line")}</div>{line("teacher", "TEACHER:")}</div>
        <table className="w-full table-fixed border-collapse border border-black text-[12px]"><colgroup><col className="w-[20.5%]" /><col className="w-[3.8%]" /><col className="w-[4.7%]" /><col className="w-[4.7%]" /><col className="w-[5.4%]" /><col className="w-[5.2%]" /><col className="w-[5.6%]" /><col className="w-[5.9%]" /><col className="w-[6.2%]" /><col className="w-[5.3%]" /><col className="w-[5.3%]" /><col className="w-[10.5%]" /><col className="w-[14.4%]" /><col className="w-[2.5%]" /></colgroup>
          <thead><tr className="h-10"><th rowSpan={2} className="border border-black px-4 text-left text-lg">SUBJECT</th><th rowSpan={2} className="border border-black">CA<br />40</th><th rowSpan={2} className="border border-black">EXAM<br />60</th><th rowSpan={2} className="border border-black">TOTAL<br />100</th><th rowSpan={2} className="border border-black">CLASS<br />HIGHEST<br />SCORE</th><th rowSpan={2} className="border border-black">CLASS<br />LOWEST<br />SCORE</th><th colSpan={5} className="border border-black">YEAR&apos;S SUMMARY</th><th rowSpan={2} className="border border-black">REMARK</th><th rowSpan={2} className="border border-black text-base">AFFECTIVE TRAITS</th><th rowSpan={2} className="border border-black" /></tr><tr className="h-11"><th className="border border-black">1ST TERM<br />SCORE</th><th className="border border-black">2ND TERM<br />SCORE</th><th className="border border-black">3RD TERM<br />SCORE</th><th className="border border-black">ANNUAL<br />TOTAL</th><th className="border border-black">ANNUAL<br />AVERAGE</th></tr></thead>
          <tbody>{subjects.map((row, index) => { const pIndex = index - 13; const trait = affective[index]; const skill = psychomotor[pIndex]; return <tr key={row.subject} className="h-6"><td className="border border-black px-4 font-bold">{row.subject}</td><td className="border border-black">{score(index, "cat", 40)}</td><td className="border border-black">{score(index, "exam", 60)}</td><td className="border border-black text-center">{row.not_offered ? "N/A" : calculated[index].total || ""}</td><td className="border border-black">{score(index, "class_highest_score")}</td><td className="border border-black">{score(index, "class_lowest_score")}</td><td className="border border-black">{score(index, "first_term_score")}</td><td className="border border-black">{score(index, "second_term_score")}</td><td className="border border-black text-center">{row.not_offered ? "N/A" : calculated[index].total || ""}</td><td className="border border-black text-center">{row.not_offered ? "N/A" : calculated[index].annualTotal || ""}</td><td className="border border-black text-center">{row.not_offered ? "N/A" : calculated[index].annualAverage ? calculated[index].annualAverage.toFixed(1) : ""}</td><td className="border border-black px-1 text-center text-[10px] font-semibold">{row.not_offered ? "N/A" : getPrimaryRemark(calculated[index].total, row.cat !== undefined || row.exam !== undefined)}</td><td className={`border border-black px-2 ${index === 12 ? "font-black" : ""}`}>{index === 11 ? "" : index === 12 ? "PSYCHOMOTOR SKILLS" : trait?.label ?? skill?.label ?? ""}</td><td className="border border-black">{trait || skill ? <select aria-label={`${(trait ?? skill).label} rating`} value={(trait ?? skill).rating ?? ""} onChange={(e) => updateRating(trait ? "affective" : "psychomotor", trait ? index : pIndex, e.target.value)} className="rating-select h-full w-full bg-transparent text-center outline-none"><option value="" /><option>A</option><option>B</option><option>C</option><option>D</option></select> : null}</td></tr>})}
          <tr className="h-7 font-bold"><td className="border border-black px-4">TOTAL</td>{Array.from({ length: 2 }, (_, i) => <td key={`total-leading-${i}`} className="border border-black" />)}<td className="border border-black text-center">{grandTotal || ""}</td>{Array.from({ length: 5 }, (_, i) => <td key={`total-summary-${i}`} className="border border-black" />)}<td className="border border-black text-center">{grandAnnualTotal || ""}</td><td className="border border-black" />{Array.from({ length: 3 }, (_, i) => <td key={`total-trailing-${i}`} className="border border-black" />)}</tr><tr className="h-7 font-bold"><td className="border border-black px-4">AVERAGE</td>{Array.from({ length: 2 }, (_, i) => <td key={`average-leading-${i}`} className="border border-black" />)}<td className="border border-black text-center">{average ? average.toFixed(1) : ""}</td>{Array.from({ length: 5 }, (_, i) => <td key={`average-summary-${i}`} className="border border-black" />)}<td className="border border-black text-center">{annualTotalAverage ? annualTotalAverage.toFixed(1) : ""}</td><td className="border border-black" />{Array.from({ length: 3 }, (_, i) => <td key={`average-trailing-${i}`} className="border border-black" />)}</tr></tbody>
        </table>
        <div className="mt-6 grid grid-cols-[1.2fr_2.65fr_1.5fr] gap-x-6 gap-y-5">
          {line("daysOpened", "Number of times school opened:")}
          {line("classTeacherRemark", "Class Teacher's Remark:")}
          <div className="grid grid-cols-[1fr_auto] gap-4 font-bold"><span>RATING KEY</span><span className="whitespace-nowrap">H1: BEGINNING OF TERM</span></div>
          {line("daysAbsent", "Number of times absent:")}
          <div className="grid grid-cols-[1fr_auto_100px] items-end gap-2"><span className="border-b border-black" /><span>Signature:</span><span className="border-b border-black" /></div>
          <div className="grid grid-cols-[1fr_auto] gap-4 font-bold"><span>A: EXCELLENT</span><span className="whitespace-nowrap">H2: END OF TERM</span></div>
          {line("nextTermBegins", "Next Term Begins:")}
          <div className="grid grid-cols-[auto_minmax(70px,1fr)_auto_100px] items-end gap-2 whitespace-nowrap"><b>Head Teacher&apos;s Remark:</b><input value={info.headTeacherRemark} onChange={(e) => setInfoValue("headTeacherRemark", e.target.value)} className="min-w-0 border-0 border-b border-black bg-transparent px-1 outline-none" /><span>Signature:</span><span className="border-b border-black" /></div>
          <div className="grid grid-cols-[1fr_auto] gap-4 font-bold"><span>B: GOOD</span><span className="whitespace-nowrap">W1: BEGINNING OF TERM</span></div>
          <div /><div />
          <div className="grid grid-cols-[1fr_auto] gap-4 font-bold"><div><div>C: AVERAGE</div><div className="mt-5">D: BELOW AVERAGE</div></div><span className="whitespace-nowrap">W2: END OF TERM</span></div>
        </div>
      </div></div>
      {message && <p className="no-print mt-3 rounded bg-red-50 p-3 text-sm text-red-700">{message}</p>}<div className="no-print mt-4 grid gap-3 sm:flex sm:flex-wrap sm:justify-end"><button type="button" onClick={onCancel} className="min-h-11 rounded-lg border border-slate-400 bg-white px-6 py-3 font-semibold">{readOnly ? "Back to Results" : "Cancel"}</button><button type="button" onClick={() => window.print()} className="min-h-11 rounded-lg bg-emerald-700 px-7 py-3 font-semibold text-white">Print Result</button>{readOnly && onEdit && <button type="button" onClick={onEdit} className="min-h-11 rounded-lg bg-sky-700 px-7 py-3 font-semibold text-white">Edit Result</button>}{!readOnly && <button type="submit" disabled={loading} className="min-h-11 rounded-lg bg-sky-700 px-7 py-3 font-semibold text-white disabled:opacity-60">{loading ? "Saving..." : submitLabel}</button>}</div>
    </form>
  </div>;
}
