"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { AssessmentCategory, AssessmentResult, NURSERY_ASSESSMENTS } from "@/types/assessment";

interface Props {
  student_name: string;
  session: string;
  term: string;
  class_name: string;
  section: "Nursery" | "Primary";
  onSubmit: (result: AssessmentResult) => Promise<void>;
  onCancel: () => void;
  initialResult?: AssessmentResult;
  readOnly?: boolean;
  draftKey?: string;
  onEdit?: () => void;
  submitLabel?: string;
}

type Info = {
  session: string; heightStart: string; heightEnd: string; age: string;
  weightStart: string; weightEnd: string; daysOpened: string; daysAbsent: string;
  nextTermBegins: string; classTeacher: string; classTeacherRemarks: string;
  classTeacherRemarksContinued: string;
  classTeacherSignature: string; headTeacherRemarks: string;
  headTeacherSignature: string; reportDate: string;
};

const pageOne = new Set(["NUMERACY", "VERBAL DEVELOPMENT", "WRITING"]);

export default function AssessmentTemplate({ student_name, session, term, class_name, section, onSubmit, onCancel, initialResult, readOnly = false, draftKey, onEdit, submitLabel = "Submit Result" }: Props) {
  const [assessments, setAssessments] = useState<AssessmentCategory[]>(
    (initialResult?.assessments?.length ? initialResult.assessments : NURSERY_ASSESSMENTS).map((category) => ({
      ...category,
      items: category.items.map((item) => ({ ...item, score: initialResult ? item.score : undefined })),
    })),
  );
  const [info, setInfo] = useState<Info>({
    session: initialResult?.session ?? session,
    heightStart: initialResult?.height_start ?? initialResult?.height ?? "",
    heightEnd: initialResult?.height_end ?? "", age: initialResult?.age ?? "",
    weightStart: initialResult?.weight_start ?? "", weightEnd: initialResult?.weight_end ?? "",
    daysOpened: initialResult?.days_school_opened?.toString() ?? "",
    daysAbsent: initialResult?.days_absent?.toString() ?? "",
    nextTermBegins: initialResult?.next_term_begins ?? "",
    classTeacher: initialResult?.class_teacher ?? "",
    classTeacherRemarks: initialResult?.class_teacher_remarks ?? "",
    classTeacherRemarksContinued: initialResult?.class_teacher_remarks_continued ?? "",
    classTeacherSignature: initialResult?.class_teacher_signature ?? "",
    headTeacherRemarks: initialResult?.head_teacher_remarks ?? "",
    headTeacherSignature: initialResult?.head_teacher_signature ?? "",
    reportDate: initialResult?.report_date ?? "",
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
        if (Array.isArray(draft.assessments)) setAssessments(draft.assessments);
        if (draft.info) setInfo(draft.info);
      }
    } catch {
      // Ignore an invalid draft and keep the clean template.
    }
    setDraftReady(true);
  }, [draftKey, readOnly]);

  useEffect(() => {
    if (!readOnly && draftKey && draftReady) {
      window.localStorage.setItem(draftKey, JSON.stringify({ assessments, info }));
    }
  }, [assessments, info, draftKey, draftReady, readOnly]);

  function cancel() {
    if (draftKey) window.localStorage.removeItem(draftKey);
    onCancel();
  }

  const updateInfo = (field: keyof Info, value: string) =>
    setInfo((current) => ({ ...current, [field]: value }));

  function updateScore(categoryIndex: number, itemIndex: number, value: string) {
    const currentItem = assessments[categoryIndex].items[itemIndex];
    if (currentItem.not_applicable) {
      if (value === "N/A") return;
      setAssessments((current) => current.map((category, currentCategory) =>
        currentCategory !== categoryIndex ? category : {
          ...category,
          items: category.items.map((item, currentItemIndex) =>
            currentItemIndex === itemIndex
              ? { ...item, score: undefined, not_applicable: false }
              : item),
        },
      ));
      return;
    }

    if (value.trim().toUpperCase().startsWith("N")) {
      setAssessments((current) => current.map((category, currentCategory) =>
        currentCategory !== categoryIndex ? category : {
          ...category,
          items: category.items.map((item, currentItemIndex) =>
            currentItemIndex === itemIndex
              ? { ...item, score: undefined, not_applicable: true }
              : item),
        },
      ));
      return;
    }

    if (!/^\d*$/.test(value)) return;
    const score = value === "" ? undefined : Math.min(5, Math.max(1, Number(value)));
    setAssessments((current) => current.map((category, currentCategory) =>
      currentCategory !== categoryIndex ? category : {
        ...category,
        items: category.items.map((item, currentItem) =>
          currentItem === itemIndex ? { ...item, score, not_applicable: false } : item),
      },
    ));
  }

  function categoryBlock(category: AssessmentCategory, categoryIndex: number, square = false) {
    return (
      <section key={category.name} className="nursery-category">
        <h2>{category.name}</h2>
        <div className="nursery-items">
          {category.items.map((item, itemIndex) => (
            <label key={item.id} className="nursery-item">
              <span className={square ? "square-bullet" : "round-bullet"}>{square ? "■" : "•"}</span>
              <span>{item.label}</span>
              <input
                aria-label={`${item.label} score`}
                type="text"
                inputMode="text"
                value={assessments[categoryIndex].items[itemIndex].not_applicable
                  ? "N/A"
                  : assessments[categoryIndex].items[itemIndex].score ?? ""}
                onChange={(event) => updateScore(categoryIndex, itemIndex, event.target.value)}
                className="score-box"
              />
            </label>
          ))}
        </div>
      </section>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await onSubmit({
        student_name, term, class_name, section, nursery_class: class_name, assessments,
        session: info.session, age: info.age, height_start: info.heightStart,
        height_end: info.heightEnd, weight_start: info.weightStart, weight_end: info.weightEnd,
        days_school_opened: Number(info.daysOpened), days_absent: Number(info.daysAbsent),
        next_term_begins: info.nextTermBegins, class_teacher: info.classTeacher,
        class_teacher_remarks: info.classTeacherRemarks,
        class_teacher_remarks_continued: info.classTeacherRemarksContinued,
        class_teacher_signature: info.classTeacherSignature,
        head_teacher_remarks: info.headTeacherRemarks,
        head_teacher_signature: info.headTeacherSignature, report_date: info.reportDate,
      });
      if (draftKey) window.localStorage.removeItem(draftKey);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to submit result.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="result-entry-page min-h-screen bg-slate-200 px-2 py-6 text-black sm:px-6">
      <form onSubmit={submit}>
        <div className="no-print mx-auto mb-5 flex max-w-[1050px] flex-col gap-3 sm:flex-row sm:justify-between">
          <button type="button" onClick={cancel} className="min-h-11 w-full rounded-lg border border-slate-400 bg-white px-5 py-2 text-sm font-semibold sm:w-auto">{readOnly ? "Back to Results" : "Cancel"}</button>
          <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
            <button type="button" onClick={() => window.print()} className="min-h-11 rounded-lg bg-emerald-700 px-6 py-2 text-sm font-semibold text-white">Print Result</button>
            {readOnly && onEdit && <button type="button" onClick={onEdit} className="min-h-11 rounded-lg bg-sky-700 px-6 py-2 text-sm font-semibold text-white">Edit Result</button>}
            {!readOnly && <button type="submit" disabled={loading} className="min-h-11 rounded-lg bg-sky-700 px-6 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {loading ? "Saving..." : submitLabel}
            </button>}
          </div>
        </div>

        <div className={`nursery-page first-page ${readOnly ? "read-only-sheet" : ""}`}>
          <header className="nursery-header">
            <Image src="/school-logo-transparent.png" alt="Regal Tulip School logo" width={120} height={120} className="nursery-logo" priority />
            <div className="nursery-title">
              <h1>REGAL TULIP SCHOOL, NKWELLE.</h1>
              <h2>PUPIL’S PROGRESS REPORT</h2>
            </div>
          </header>

          <div className="header-lines first-header-line">
            <label>TERM:<input value={term} disabled /></label>
            <label>SESSION:<input value={info.session} onChange={(e) => updateInfo("session", e.target.value)} /></label>
            <div className="paired"><b>HEIGHT:</b><label>H1 (cm):<input value={info.heightStart} onChange={(e) => updateInfo("heightStart", e.target.value)} /></label><label>H2 (cm):<input value={info.heightEnd} onChange={(e) => updateInfo("heightEnd", e.target.value)} /></label></div>
          </div>
          <div className="header-lines second-header-line">
            <label className="name-field">NAME:<input value={student_name} disabled /></label>
            <label>NURSERY:<input value={class_name} disabled /></label>
            <label>AGE:<input value={info.age} onChange={(e) => updateInfo("age", e.target.value)} /></label>
            <div className="paired"><b>WEIGHT</b><label>W1 (kg):<input value={info.weightStart} onChange={(e) => updateInfo("weightStart", e.target.value)} /></label><label>W2 (kg):<input value={info.weightEnd} onChange={(e) => updateInfo("weightEnd", e.target.value)} /></label></div>
          </div>

          {assessments.map((category, index) => pageOne.has(category.name) ? categoryBlock(category, index) : null)}

          <div className="measurement-key">
            <b>KEY</b><span>H1 - BEGINNING OF TERM</span><span>H2- END OF TERM</span>
            <span>W1 - BEGINNING OF TERM</span><span>W2 - END OF TERM</span>
          </div>
        </div>

        <div className={`nursery-page second-page ${readOnly ? "read-only-sheet" : ""}`}>
          {assessments.map((category, index) => !pageOne.has(category.name) ? categoryBlock(category, index, true) : null)}

          <section className="grading-key">
            <h2>KEY</h2>
            <p><span>5 - EXCELLENT</span><span>4 - VERY GOOD</span><span>3 - GOOD</span></p>
            <p><span>2 - BEGINNING TO SHOW THE TRAIT</span><span>1 - NOT AWARE YET/ YET TO LEARN HOW</span></p>
          </section>

          <section className="footer-fields">
            <div className="two-fields">
              <label>NUMBER OF TIMES SCHOOL OPENED:<input type="number" value={info.daysOpened} onChange={(e) => updateInfo("daysOpened", e.target.value)} /></label>
              <label>NUMBER OF TIMES ABSENT:<input type="number" value={info.daysAbsent} onChange={(e) => updateInfo("daysAbsent", e.target.value)} /></label>
            </div>
            <label>NEXT TERM BEGINS:<input value={info.nextTermBegins} onChange={(e) => updateInfo("nextTermBegins", e.target.value)} /></label>
            <div className="two-fields teacher-fields">
              <label>CLASS TEACHER:<input value={info.classTeacher} onChange={(e) => updateInfo("classTeacher", e.target.value)} /></label>
              <label>CLASS TEACHER’S REMARKS:<input value={info.classTeacherRemarks} onChange={(e) => updateInfo("classTeacherRemarks", e.target.value)} /></label>
            </div>
            <label className="center-signature">
              <input aria-label="Continue class teacher remarks" value={info.classTeacherRemarksContinued} onChange={(e) => updateInfo("classTeacherRemarksContinued", e.target.value)} />
              <span>SIGNATURE</span>
              <input aria-label="Class teacher signature" value={info.classTeacherSignature} onChange={(e) => updateInfo("classTeacherSignature", e.target.value)} />
            </label>
            <label>HEAD TEACHER’S REMARKS:<input value={info.headTeacherRemarks} onChange={(e) => updateInfo("headTeacherRemarks", e.target.value)} /></label>
            <div className="two-fields final-fields">
              <label>SIGNATURE<input value={info.headTeacherSignature} onChange={(e) => updateInfo("headTeacherSignature", e.target.value)} /></label>
              <label>DATE:<input value={info.reportDate} onChange={(e) => updateInfo("reportDate", e.target.value)} /></label>
            </div>
          </section>
        </div>

        {message && <p className="no-print mx-auto mt-4 max-w-[1050px] rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}
      </form>

      <style jsx global>{`
        .nursery-page{width:min(100%,1050px);min-height:1485px;margin:0 auto 24px;background:#fff;padding:38px 62px 34px;font-family:Arial,Helvetica,sans-serif;box-shadow:0 2px 14px rgb(15 23 42 / 16%)}
        .nursery-header{display:grid;grid-template-columns:130px 1fr 90px;align-items:center;min-height:120px}.nursery-logo{width:112px;height:112px;object-fit:contain}
        .nursery-title{grid-column:2;text-align:center}.nursery-title h1{font-size:31px;font-weight:800;letter-spacing:.01em;white-space:nowrap}.nursery-title h2{margin-top:20px;font-size:21px;font-weight:800}
        .header-lines{display:flex;align-items:end;gap:12px;font-size:17px}.first-header-line{margin-top:18px;justify-content:flex-end}.second-header-line{margin-top:28px}
        .header-lines label,.footer-fields label{display:flex;align-items:end;gap:7px;white-space:nowrap}.header-lines input,.footer-fields input{min-width:0;border:0;border-bottom:2px solid #111;border-radius:0;background:transparent;padding:1px 3px;outline:none}.header-lines input:disabled{color:#111;opacity:1}
        .first-header-line>label:first-child input{width:90px}.first-header-line>label:nth-child(2) input{width:190px}.paired{display:flex;align-items:end;gap:7px;margin-left:auto}.paired input{width:45px}
        .name-field{flex:0 0 auto}.name-field input{width:195px}.second-header-line>label:nth-child(2) input{width:110px}.second-header-line>label:nth-child(3) input{width:100px}
        .nursery-category{margin-top:25px}.nursery-category h2,.grading-key h2{font-size:21px;font-weight:800}.nursery-items{margin-top:12px;display:grid;gap:7px}
        .nursery-item{display:grid;grid-template-columns:28px 1fr 56px;align-items:center;min-height:28px;font-size:16px}.round-bullet,.square-bullet{text-align:center;font-weight:900}.square-bullet{font-size:13px}
        .score-box{width:56px;height:26px;border:2px solid #111;border-radius:0;background:#fff;padding:0 4px;text-align:center;font-size:16px;outline:none;appearance:textfield}.score-box::-webkit-inner-spin-button,.score-box::-webkit-outer-spin-button{appearance:none;margin:0}
        .measurement-key{display:flex;justify-content:space-between;gap:14px;margin-top:24px;font-size:14px;font-weight:700}.second-page{padding-top:38px}.second-page .nursery-category{margin-top:0;margin-bottom:24px}.second-page .nursery-items{margin-left:40px}.second-page .nursery-item{grid-template-columns:32px 1fr 56px;font-size:17px}
        .grading-key{margin-top:13px}.grading-key p{display:flex;gap:40px;margin:8px 0 0 92px;font-size:15px}.footer-fields{display:grid;gap:16px;margin-top:28px;font-size:14px}.footer-fields>label input{flex:1}.two-fields{display:grid;grid-template-columns:1fr 1fr;gap:16px}.two-fields label input{flex:1}.teacher-fields{grid-template-columns:.95fr 1.05fr}
        .center-signature{display:grid!important;grid-template-columns:1fr auto 1fr;align-items:end;gap:12px!important}.center-signature input,.center-signature i{width:100%;border-bottom:2px solid #111}.final-fields{grid-template-columns:1fr 1.1fr}
        @media screen and (max-width:800px){.nursery-page{min-height:0;padding:24px 20px;overflow-x:auto}.nursery-header{grid-template-columns:82px 1fr}.nursery-logo{width:76px;height:76px}.nursery-title{grid-column:2}.nursery-title h1{white-space:normal;font-size:22px}.nursery-title h2{margin-top:10px;font-size:17px}.header-lines,.measurement-key{flex-wrap:wrap}.paired{margin-left:0}.nursery-item{grid-template-columns:22px minmax(210px,1fr) 48px;font-size:13px}.score-box{width:48px}.second-page .nursery-items{margin-left:0}.grading-key p{margin-left:0;flex-wrap:wrap;gap:8px 24px}.two-fields{grid-template-columns:1fr}}
        @media print{@page{size:A4 portrait;margin:0}body{background:#fff!important}.no-print{display:none!important}.nursery-page{width:1050px;height:1485px;min-height:1485px;margin:0;padding:38px 62px 34px;overflow:hidden;box-shadow:none;zoom:.756;break-inside:avoid;page-break-inside:avoid;break-after:page;page-break-after:always}.nursery-page:last-of-type{break-after:auto;page-break-after:auto}}
      `}</style>
    </main>
  );
}
