"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import { clearAdminSession } from "@/lib/adminAuth";
import AssessmentTemplate from "@/components/AssessmentTemplate";
import PrimaryAssessmentTemplate from "@/components/PrimaryAssessmentTemplate";
import PrimaryThirdTermTemplate from "@/components/PrimaryThirdTermTemplate";
import type { AssessmentResult } from "@/types/assessment";
import { getStaffClasses } from "@/lib/staffClassAccess";
import { canControlStaffAccess, isPortalAdmin } from "@/lib/portalAdmins";

const termOptions = [
  { value: "1st Term", label: "1st Term" },
  { value: "2nd Term", label: "2nd Term" },
  { value: "3rd Term", label: "3rd Term" },
];

const classArms = ["R", "S", "T"];
const nurseryClassOptions = ["Nursery 1", "Nursery 2", "Nursery 3"].flatMap((className) =>
  classArms.map((arm) => `${className}${arm}`),
);
const primaryClassOptions = ["Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"].flatMap((className) =>
  classArms.map((arm) => `${className}${arm}`),
);
const sessionOptions = ["2021/2022", "2022/2023", "2023/2024", "2024/2025", "2025/2026", "2026/2027"];

export default function DashboardPage() {
  const [supabase, setSupabase] = useState<any | null>(null);
  const supabaseRef = useRef<any | null>(null);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsMessage, setResultsMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ student_name: "", session: "2025/2026" });
  const [selectedTerm, setSelectedTerm] = useState(termOptions[0].value);
  const [selectedSection, setSelectedSection] = useState<"Nursery" | "Primary">("Nursery");
  const [selectedClassName, setSelectedClassName] = useState(nurseryClassOptions[0]);
  const [staffAccessEnabled, setStaffAccessEnabled] = useState(false);
  const [accessMessage, setAccessMessage] = useState("Loading staff access...");
  const [staffEmails, setStaffEmails] = useState<string[]>([]);
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [loadingStaffAccess, setLoadingStaffAccess] = useState(true);
  const [isSupabaseUnavailable, setIsSupabaseUnavailable] = useState(false);
  const [showAssessmentTemplate, setShowAssessmentTemplate] = useState(false);
  const [priorPrimaryResults, setPriorPrimaryResults] = useState<{ first?: AssessmentResult; second?: AssessmentResult }>({});
  const [entryStateReady, setEntryStateReady] = useState(false);
  const normalizedUserEmail = user?.email?.trim().toLowerCase() ?? "";
  const isAdmin = Boolean(user) && isPortalAdmin(normalizedUserEmail);
  const mayControlStaffAccess = Boolean(user) && canControlStaffAccess(normalizedUserEmail);
  const assignedClasses = getStaffClasses(normalizedUserEmail);
  const assignedClass = assignedClasses[0];
  const isNurseryResult = (row: { assessment_data?: unknown; class_name?: unknown }) => {
    try {
      const assessment = typeof row.assessment_data === "string" ? JSON.parse(row.assessment_data) : row.assessment_data;
      return assessment?.section === "Nursery" || String(row.class_name ?? "").startsWith("Nursery");
    } catch {
      return String(row.class_name ?? "").startsWith("Nursery");
    }
  };
  const getTermAverage = (row: { assessment_data?: unknown; average_score?: unknown }) => {
    try {
      const assessment = (typeof row.assessment_data === "string"
        ? JSON.parse(row.assessment_data)
        : row.assessment_data) as AssessmentResult | undefined;
      const totals = (assessment?.primary_subjects ?? [])
        .filter((subject) =>
          !subject.not_offered
          && subject.total !== undefined
          && (subject.cat !== undefined || subject.exam !== undefined))
        .map((subject) => Number(subject.total))
        .filter(Number.isFinite);
      if (totals.length) return totals.reduce((sum, total) => sum + total, 0) / totals.length;
    } catch {
      // Fall back to the stored term average for legacy or damaged rows.
    }
    return Number(row.average_score || 0);
  };

  function readLocalResults(): any[] {
    if (typeof window === "undefined") return [];
    const prefix = "regal-tulip-result:";
    const saved: any[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      try {
        const row = JSON.parse(window.localStorage.getItem(key) ?? "null");
        if (!row?.id) continue;
        const ownerId = row.uploaded_by ?? row.owner_id;
        const ownerEmail = String(row.uploaded_by_email ?? "").toLowerCase();
        const currentEmail = String(user?.email ?? "").toLowerCase();
        const belongsToCurrentUser = ownerId === user?.id || (ownerEmail && ownerEmail === currentEmail);
        if (isAdmin || belongsToCurrentUser) saved.push(row);
      } catch {
        // Ignore a damaged browser-storage entry and continue loading the others.
      }
    }
    return saved.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  }

  function mergeWithLocalResults(remoteRows: any[]): any[] {
    const localRows = readLocalResults();
    const localIds = new Set(localRows.map((row) => row.id));
    return [...localRows, ...remoteRows.filter((row) => !localIds.has(row.id))];
  }

  useEffect(() => {
    const sb = getBrowserSupabase();
    setSupabase(sb);
    supabaseRef.current = sb;
    let mounted = true;

    if (!sb) {
      setAuthLoading(false);
      return;
    }

    (async () => {
      const { data } = await sb.auth.getSession();
      if (!mounted) return;
      const currentUser = data.session?.user ?? null;
      setUser((existing: any) => existing?.id === currentUser?.id ? existing : currentUser);
      setAuthLoading(false);
    })();

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser((existing: any) => existing?.id === nextUser?.id ? existing : nextUser);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    supabaseRef.current = supabase;
  }, [supabase]);

  useEffect(() => {
    async function loadStaffAccess() {
      if (!supabase) {
        setIsSupabaseUnavailable(true);
        setAccessMessage("Supabase is unavailable. Upload controls are running in demo mode.");
        setLoadingStaffAccess(false);
        return;
      }

      setLoadingStaffAccess(true);
      setAccessMessage("Loading staff access...");

      function isMeaningfulError(err: any) {
        try {
          if (!err) return false;
          if (typeof err === "string") return err.trim().length > 0;
          if (typeof err === "object") {
            if ("message" in err && err.message) return true;
            if (Object.keys(err).length > 0) return true;
            const s = JSON.stringify(err);
            return s !== "{}" && s !== "null";
          }
          return true;
        } catch (e) {
          return true;
        }
      }

      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from("portal_settings")
          .select("key, value")
          .in("key", ["staff_access_enabled", "admin_email"]);

        if (settingsError) {
          const isMissingTable = settingsError?.code === "PGRST205" || String(settingsError?.message || "").includes("Could not find the table");
          if (isMissingTable) {
            console.warn("portal_settings missing:", settingsError);
            setAccessMessage("Supabase tables not found. Run the SQL in docs/supabase-setup.md to create them.");
          } else if (isMeaningfulError(settingsError)) {
            console.error("portal_settings error:", settingsError);
          } else {
            console.warn("portal_settings warning (uninformative):", settingsError);
          }
        } else if (settingsData) {
          const enabledSetting = settingsData.find((row: any) => row.key === "staff_access_enabled");
          const adminSetting = settingsData.find((row: any) => row.key === "admin_email");

          setStaffAccessEnabled(enabledSetting?.value === "true");
          setAdminEmail(adminSetting?.value ?? null);
        }

        const { data: staffData, error: staffError } = await supabase.from("staff_access").select("email");
        if (staffError) {
          const isMissingTable = staffError?.code === "PGRST205" || String(staffError?.message || "").includes("Could not find the table");
          if (isMissingTable) {
            console.warn("staff_access missing:", staffError);
            setAccessMessage((prev) => prev + " Supabase staff_access table missing. Create it via docs/supabase-setup.md.");
          } else if (isMeaningfulError(staffError)) {
            console.error("staff_access error:", staffError);
          } else {
            console.warn("staff_access warning (uninformative):", staffError);
          }
        } else if (staffData) {
          setStaffEmails(staffData.map((row: any) => row.email));
        }

        setLoadingStaffAccess(false);
        setAccessMessage("Staff upload access settings loaded.");
      } catch (error) {
        console.warn("Supabase staff access lookup failed; using demo mode.", error);
        setIsSupabaseUnavailable(true);
        setStaffAccessEnabled(false);
        setAdminEmail(null);
        setStaffEmails([]);
        setLoadingStaffAccess(false);
        setAccessMessage("Supabase is unavailable. Upload controls are running in demo mode.");
      }
    }

    loadStaffAccess();
  }, [supabase]);

  useEffect(() => {
    if (!user || !supabase) return;
    const controller = new AbortController();
    void fetchResults(controller.signal);
    return () => controller.abort();
  }, [user?.id, supabase]);

  useEffect(() => {
    if (!user || !supabase) return;

    const refreshResults = () => void fetchResults();
    const resultChanges = supabase
      .channel(`result-manager-sync:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        refreshResults,
      )
      .subscribe();

    window.addEventListener("focus", refreshResults);
    document.addEventListener("visibilitychange", refreshResults);

    return () => {
      window.removeEventListener("focus", refreshResults);
      document.removeEventListener("visibilitychange", refreshResults);
      void supabase.removeChannel(resultChanges);
    };
  }, [user?.id, supabase]);

  useEffect(() => {
    if (!isAdmin && assignedClass) {
      setSelectedSection(assignedClass.startsWith("Nursery") ? "Nursery" : "Primary");
      setSelectedClassName(assignedClass);
      return;
    }
    if (!isAdmin && user && !assignedClass) {
      setShowAssessmentTemplate(false);
      return;
    }
    const options = selectedSection === "Nursery" ? nurseryClassOptions : primaryClassOptions;
    setSelectedClassName((current) => options.includes(current) ? current : options[0]);
  }, [selectedSection, assignedClass, isAdmin, entryStateReady]);

  useEffect(() => {
    if (!user?.id) return;
    setEntryStateReady(false);
    try {
      const saved = window.localStorage.getItem(`regal-tulip-entry-state:${user.id}`);
      if (saved) {
        const entry = JSON.parse(saved);
        if (entry.form?.student_name !== undefined) setForm(entry.form);
        if (termOptions.some((option) => option.value === entry.selectedTerm)) setSelectedTerm(entry.selectedTerm);
        if (entry.selectedSection === "Nursery" || entry.selectedSection === "Primary") setSelectedSection(entry.selectedSection);
        if (typeof entry.selectedClassName === "string") setSelectedClassName(entry.selectedClassName);
        setShowAssessmentTemplate(Boolean(entry.showAssessmentTemplate));
      }
    } catch {
      // A damaged draft should never prevent the dashboard from opening.
    }
    setEntryStateReady(true);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !entryStateReady) return;
    window.localStorage.setItem(`regal-tulip-entry-state:${user.id}`, JSON.stringify({
      form, selectedTerm, selectedSection, selectedClassName, showAssessmentTemplate,
    }));
  }, [user?.id, entryStateReady, form, selectedTerm, selectedSection, selectedClassName, showAssessmentTemplate]);

  const activeDraftKey = user?.id
    ? `regal-tulip-result-draft:${user.id}:${selectedSection}:${selectedClassName}:${selectedTerm}:${form.session}:${form.student_name.trim().toLowerCase()}`
    : undefined;

  async function fetchResults(signal?: AbortSignal) {
    if (!supabase) {
      if (signal?.aborted) return;
      setIsSupabaseUnavailable(true);
      setResults(readLocalResults());
      setResultsMessage("Supabase is unavailable. Showing results saved in this browser only.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setResultsMessage(null);
    try {
      let query = supabase.from("students").select("*").order("created_at", { ascending: false });
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query;
      if (signal?.aborted) return;
      if (error) {
        console.warn("Supabase results lookup failed; showing browser-saved results only.", error);
        setResults(readLocalResults());
        setResultsMessage(`Could not load database results: ${error.message}`);
        setIsSupabaseUnavailable(true);
      } else {
        setResults(mergeWithLocalResults(data ?? []));
        setIsSupabaseUnavailable(false);
      }
    } catch (error) {
      if (signal?.aborted) return;
      console.warn("Supabase results request failed; showing browser-saved results only.", error);
      setResults(readLocalResults());
      setResultsMessage("Could not connect to the results database. Showing results saved in this browser only.");
      setIsSupabaseUnavailable(true);
    }
    if (!signal?.aborted) setLoading(false);
  }

  async function handleCreateClick(e: React.FormEvent) {
    e.preventDefault();

    if (!isAdmin && !assignedClasses.includes(selectedClassName)) {
      setAccessMessage("Your account is not assigned to this class.");
      return;
    }

    if (!form.student_name.trim()) {
      setAccessMessage("Please enter the student's name.");
      return;
    }

    if (selectedSection === "Primary" && selectedTerm === "3rd Term") {
      let matchingRows = results.filter((row) =>
        row.student_name?.trim().toLowerCase() === form.student_name.trim().toLowerCase() &&
        row.class_name === selectedClassName &&
        (row.term === "1st Term" || row.term === "2nd Term") &&
        (() => {
          try {
            const assessment = typeof row.assessment_data === "string" ? JSON.parse(row.assessment_data) : row.assessment_data;
            return assessment?.session === form.session;
          } catch {
            return false;
          }
        })()
      );

      if (supabase) {
        const { data, error } = await supabase
          .from("students")
          .select("student_name, class_name, term, assessment_data, created_at")
          .ilike("student_name", form.student_name.trim())
          .eq("class_name", selectedClassName)
          .eq("assessment_data->>session", form.session)
          .in("term", ["1st Term", "2nd Term"])
          .order("created_at", { ascending: false });

        if (!error && data) {
          matchingRows = data;
        } else if (error) {
          console.warn("Could not load the pupil's earlier term results; using locally loaded records.", error);
        }
      }

      const parseAssessment = (value: unknown): AssessmentResult | undefined => {
        if (!value) return undefined;
        try {
          return (typeof value === "string" ? JSON.parse(value) : value) as AssessmentResult;
        } catch {
          return undefined;
        }
      };
      const firstRow = matchingRows.find((row) => row.term === "1st Term");
      const secondRow = matchingRows.find((row) => row.term === "2nd Term");
      setPriorPrimaryResults({
        first: parseAssessment(firstRow?.assessment_data),
        second: parseAssessment(secondRow?.assessment_data),
      });
    } else {
      setPriorPrimaryResults({});
    }

    setShowAssessmentTemplate(true);
  }

  async function handleAssessmentSubmit(result: AssessmentResult) {
    if (!form.student_name.trim()) {
      return;
    }
    if (!isAdmin && !assignedClasses.includes(result.class_name)) {
      setAccessMessage("Upload blocked: your account is not assigned to this class.");
      return;
    }

    // Nursery reports use developmental ratings, not academic averages.
    const averageScore = result.section === "Primary"
      ? (() => {
          const totals = (result.primary_subjects ?? [])
            .filter((subject) => !subject.not_offered && subject.total !== undefined)
            .map((subject) => subject.total as number);
          return totals.length ? Number((totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(2)) : 0;
        })()
      : 0;

    const payload = {
      student_name: result.student_name,
      class_name: result.class_name,
      term: result.term,
      average_score: averageScore,
      assessment_data: result,
      uploaded_by: user.id,
      uploaded_by_email: user.email?.toLowerCase() ?? null,
    };

    const storeLocalResult = (row: Record<string, unknown>) => {
      try {
        window.localStorage.setItem(`regal-tulip-result:${String(row.id)}`, JSON.stringify(row));
      } catch (error) {
        console.warn("Could not persist the local result in this browser.", error);
      }
    };

    if (!supabase) {
      const localResult = {
        id: `local-${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString(),
      };
      storeLocalResult(localResult);
      setResults((prev) => [localResult, ...prev]);
      setForm({ student_name: "", session: "2025/2026" });
      setSelectedTerm(termOptions[0].value);
      setSelectedSection("Nursery");
      setSelectedClassName(nurseryClassOptions[0]);
      setShowAssessmentTemplate(false);
      setAccessMessage("Result saved locally (Supabase unavailable).");
      return;
    }

    try {
      const { data: savedResult, error } = await supabase
        .from("students")
        .insert([payload])
        .select("id, student_name, class_name, term, average_score, assessment_data, created_at, uploaded_by, uploaded_by_email")
        .single();
      if (error) {
        console.warn("Supabase insert failed; saving locally.", error);
        const localResult = {
          id: `local-${Date.now()}`,
          ...payload,
          created_at: new Date().toISOString(),
        };
        storeLocalResult(localResult);
        setResults((prev) => [localResult, ...prev]);
        setAccessMessage("Result saved locally (Supabase error).");
      } else if (savedResult) {
        setAccessMessage("Result submitted successfully.");
        setResults((prev) => [savedResult, ...prev]);
      } else {
        setAccessMessage("The result was uploaded, but its record could not be reloaded. Refresh the dashboard before viewing it.");
        await fetchResults();
      }
    } catch (error) {
      console.warn("Supabase insert request failed; saving locally.", error);
      const localResult = {
        id: `local-${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString(),
      };
      storeLocalResult(localResult);
      setResults((prev) => [localResult, ...prev]);
      setAccessMessage("Result saved locally (network error).");
    }

    setForm({ student_name: "", session: "2025/2026" });
    setSelectedTerm(termOptions[0].value);
    setSelectedSection("Nursery");
    setSelectedClassName(nurseryClassOptions[0]);
    setShowAssessmentTemplate(false);
  }

  async function handleDelete(id: string) {
    if (!isAdmin) {
      setAccessMessage("Only the administrator can delete results.");
      return;
    }
    if (!confirm("Delete this result? This action cannot be undone.")) return;
    if (id.startsWith("local-")) {
      window.localStorage.removeItem(`regal-tulip-result:${id}`);
      setResults((rows) => rows.filter((row) => row.id !== id));
      setResultsMessage("Browser-saved result deleted.");
      return;
    }
    if (!supabase) {
      setResultsMessage("Could not delete this database result because Supabase is unavailable.");
      return;
    }
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) {
      console.error(error);
      setResultsMessage(`Could not delete the result: ${error.message}`);
      return;
    }
    setResults((rows) => rows.filter((row) => row.id !== id));
    setResultsMessage("Result deleted successfully.");
  }

  const primaryResults = results.filter((row) => !isNurseryResult(row));
  const averageScore = primaryResults.length
    ? Math.round(primaryResults.reduce((sum, row) => sum + getTermAverage(row), 0) / primaryResults.length)
    : 0;

  const STAFF_ACCESS_CODE = "school2026";
  const isAuthorizedUploader = Boolean(user) && staffAccessEnabled && assignedClasses.length > 0 && user?.user_metadata?.portal_role !== "guardian";

  async function saveSetting(key: string, value: string) {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("portal_settings")
      .upsert({ key, value }, { onConflict: ["key"] });
    if (error) {
      console.error(error);
    }
    return data;
  }

  async function handleAccessToggle() {
    if (!mayControlStaffAccess) {
      setAccessMessage("Only the primary administrator can lock or unlock staff access.");
      return;
    }
    if (!supabase) return;

    if (staffAccessEnabled) {
      setStaffAccessEnabled(false);
      await saveSetting("staff_access_enabled", "false");
      setAccessMessage("Staff upload access is now locked for all staff accounts.");
      return;
    }

    const enteredCode = window.prompt("Enter the staff access code to unlock uploads")?.trim();
    if (enteredCode === STAFF_ACCESS_CODE) {
      setStaffAccessEnabled(true);
      await saveSetting("staff_access_enabled", "true");
      if (user?.email && !adminEmail) {
        setAdminEmail(user.email);
        await saveSetting("admin_email", user.email);
      }
      setAccessMessage("Staff upload access is now unlocked for every registered account.");
    } else {
      setAccessMessage("Incorrect access code. Staff upload access remains locked.");
    }
  }

  async function handleGrantStaffAccess(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) {
      setAccessMessage("Only the administrator can grant staff access.");
      return;
    }
    if (!supabase) return;

    const trimmedEmail = newStaffEmail.trim().toLowerCase();
    if (!trimmedEmail) return;

    if (!trimmedEmail.includes("@")) {
      setAccessMessage("Please enter a valid staff email address.");
      return;
    }

    const { error } = await supabase.from("staff_access").insert({ email: trimmedEmail });
    if (error) {
      console.error(error);
      setAccessMessage("Could not grant staff access. Please try again.");
      return;
    }

    setStaffEmails((prev) => [...prev, trimmedEmail]);
    setNewStaffEmail("");
    setAccessMessage(`Granted upload access to ${trimmedEmail}.`);
  }

  async function handleRemoveStaffAccess(email: string) {
    if (!isAdmin) {
      setAccessMessage("Only the administrator can remove staff access.");
      return;
    }
    if (!supabase) return;

    const { error } = await supabase.from("staff_access").delete().eq("email", email);
    if (error) {
      console.error(error);
      setAccessMessage("Could not remove staff access. Please try again.");
      return;
    }

    setStaffEmails((prev) => prev.filter((item) => item !== email));
    setAccessMessage(`Removed upload access for ${email}.`);
  }

  async function handleSignOut() {
    try {
      if (supabase) await supabase.auth.signOut();
    } catch (error) {
      console.warn("Supabase sign out failed; clearing the local session.", error);
    } finally {
      clearAdminSession();
      setUser(null);
      window.location.assign("/login");
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <p className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-sm">Loading your secure dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">Session required</p>
          <h1 className="mt-3 text-2xl font-semibold">Please sign in to continue.</h1>
          <Link href="/login" className="mt-6 inline-block rounded-full bg-sky-600 px-5 py-2.5 font-semibold text-white hover:bg-sky-700">Go to sign in</Link>
        </div>
      </div>
    );
  }

  if (entryStateReady && showAssessmentTemplate && form.student_name && (isAdmin || assignedClasses.includes(selectedClassName))) {
    if (selectedSection === "Primary") {
      if (selectedTerm === "3rd Term") {
        return (
          <PrimaryThirdTermTemplate
            student_name={form.student_name}
            session={form.session}
            term={selectedTerm}
            class_name={selectedClassName}
            draftKey={activeDraftKey}
            priorTermResults={priorPrimaryResults}
            onSubmit={handleAssessmentSubmit}
            onCancel={() => {
              if (activeDraftKey) window.localStorage.removeItem(activeDraftKey);
              setShowAssessmentTemplate(false);
              setForm({ student_name: "", session: "2025/2026" });
            }}
          />
        );
      }
      return (
        <PrimaryAssessmentTemplate
          student_name={form.student_name}
          session={form.session}
          term={selectedTerm}
          class_name={selectedClassName}
          draftKey={activeDraftKey}
          onSubmit={handleAssessmentSubmit}
          onCancel={() => {
            if (activeDraftKey) window.localStorage.removeItem(activeDraftKey);
            setShowAssessmentTemplate(false);
            setForm({ student_name: "", session: "2025/2026" });
          }}
        />
      );
    }
    return (
      <AssessmentTemplate
        student_name={form.student_name}
        session={form.session}
        term={selectedTerm}
        class_name={selectedClassName}
        section={selectedSection}
        draftKey={activeDraftKey}
        onSubmit={handleAssessmentSubmit}
        onCancel={() => {
          if (activeDraftKey) window.localStorage.removeItem(activeDraftKey);
          setShowAssessmentTemplate(false);
          setForm({ student_name: "", session: "2025/2026" });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 px-2 py-3 text-slate-100 sm:px-4 sm:py-6 lg:px-8">
      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
        }
      `}</style>
      <div className="mx-auto flex min-w-0 max-w-7xl flex-col gap-4 sm:gap-6 lg:flex-row">
        <aside className="w-full rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur sm:rounded-3xl sm:p-6 lg:w-72 lg:shrink-0">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">Regal Tulip</p>
          <h1 className="mt-3 text-2xl font-semibold">Admin Portal</h1>
          <p className="mt-2 text-sm text-slate-300">A secure workspace for school results and guardian updates.</p>

          <nav className="mt-5 grid grid-cols-3 gap-2 lg:mt-8 lg:block lg:space-y-2">
            <a href="#overview" className="flex items-center rounded-2xl bg-sky-500/20 px-3 py-2 text-sm font-medium text-white">Overview</a>
            <a href="#results" className="flex items-center rounded-2xl px-3 py-2 text-sm text-slate-300 hover:bg-white/10">Results</a>
            <a href="#reports" className="flex items-center rounded-2xl px-3 py-2 text-sm text-slate-300 hover:bg-white/10">Reports</a>
          </nav>

          <div className="mt-8 rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4">
            <p className="text-sm font-semibold text-sky-200">Quick tip</p>
            <p className="mt-2 text-sm text-slate-300">Keep term results current so guardians can see the latest update immediately.</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-4 sm:space-y-6">
          <section id="overview" className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl sm:rounded-3xl sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">School administration</p>
                <h2 className="mt-2 break-words text-2xl font-semibold text-white sm:text-3xl">Welcome back, {user.email}</h2>
              </div>
              <div className="no-print flex flex-wrap gap-2">
                <button onClick={handleSignOut} className="rounded-full border border-red-400/60 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20">Sign out</button>
                {mayControlStaffAccess && (
                  <button onClick={handleAccessToggle} className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
                    {staffAccessEnabled ? "Lock staff access" : "Unlock staff access"}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm text-slate-300">
              {accessMessage}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-800/80 p-4">
                <p className="text-sm text-slate-400">Results uploaded</p>
                <p className="mt-2 text-2xl font-semibold text-white">{results.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-800/80 p-4">
                <p className="text-sm text-slate-400">Average score</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-400">{averageScore}%</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-800/80 p-4">
                <p className="text-sm text-slate-400">Latest term</p>
                <p className="mt-2 text-2xl font-semibold text-white">{results[0]?.term || "—"}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-white p-4 text-slate-900 shadow-xl sm:rounded-3xl sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-600">Add new result</p>
                <h3 className="mt-2 text-xl font-semibold">Create a new student result</h3>
              </div>
              <div className="text-sm text-slate-500">A simple way to publish updates for guardians.</div>
            </div>

            {(isAdmin || isAuthorizedUploader) ? (
              <form onSubmit={handleCreateClick} className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(160px,1.4fr)_minmax(105px,1fr)_minmax(105px,1fr)_minmax(120px,1fr)_minmax(130px,1fr)_auto]">
                <input className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-0 focus:border-sky-500" placeholder="Student name" value={form.student_name} onChange={(e) => setForm({ ...form, student_name: e.target.value })} />
                <select className="rounded-2xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-500" value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)}>
                  {termOptions.map((term) => (
                    <option key={term.value} value={term.value}>{term.label}</option>
                  ))}
                </select>
                <select disabled={!isAdmin} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-500 disabled:opacity-100" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value as "Nursery" | "Primary")}>
                  {(isAdmin || assignedClass?.startsWith("Nursery")) && <option value="Nursery">Nursery</option>}
                  {(isAdmin || assignedClass?.startsWith("Primary")) && <option value="Primary">Primary</option>}
                </select>
                <select disabled={!isAdmin} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-500 disabled:opacity-100" value={selectedClassName} onChange={(e) => setSelectedClassName(e.target.value)}>
                  {(isAdmin ? (selectedSection === "Nursery" ? nurseryClassOptions : primaryClassOptions) : assignedClasses).map((className) => (
                    <option key={className} value={className}>{className}</option>
                  ))}
                </select>
                <select aria-label="Academic session" className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-500" value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })}>
                  {sessionOptions.map((session) => <option key={session} value={session}>{session}</option>)}
                </select>
                <button className="w-full rounded-2xl bg-sky-600 px-5 py-2 font-semibold text-white hover:bg-sky-700 xl:w-auto">Add</button>
              </form>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                {isAdmin
                  ? "Admin can still upload results while the portal is locked."
                  : assignedClasses.length === 0
                  ? "Your existing account can sign in, but it has not been assigned to a class for result uploads."
                  : "Staff upload access is locked. Ask the administrator to unlock access for registered staff accounts."}
              </div>
            )}
          </section>

          <section id="results" className="print-card rounded-2xl border border-slate-800 bg-white p-4 text-slate-900 shadow-xl sm:rounded-3xl sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-600">Results manager</p>
                <h3 className="mt-2 text-xl font-semibold">Recent records</h3>
              </div>
              <div className="text-sm text-slate-500">Edit or remove entries whenever updates are needed.</div>
            </div>

            {resultsMessage && (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{resultsMessage}</p>
            )}

            {loading ? (
              <p className="mt-6 text-sm text-slate-500">Loading results...</p>
            ) : (
              <div className="mt-6 max-w-full overflow-x-auto rounded-2xl border border-slate-200 [-webkit-overflow-scrolling:touch]">
                <table className="min-w-[680px] divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Class</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Term</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Average</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {results.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">No results have been uploaded yet.</td>
                      </tr>
                    )}
                    {results.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          {r.student_name}
                        </td>
                        <td className="px-4 py-3">
                          {r.class_name}
                        </td>
                        <td className="px-4 py-3">
                          {r.term}
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-600">
                          {isNurseryResult(r) ? (
                            "—"
                          ) : (
                            `${getTermAverage(r).toFixed(1)}%`
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                              <Link href={`/results/${r.id}`} onClick={() => {
                                try {
                                  const prefix = String(r.id).startsWith("local-") ? "regal-tulip-result:" : "regal-tulip-review:";
                                  window.localStorage.setItem(`${prefix}${r.id}`, JSON.stringify(r));
                                } catch {
                                  // The review page will retrieve the record from Supabase.
                                }
                              }} className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">View</Link>
                              <Link href={`/results/${r.id}?edit=1`} onClick={() => {
                                try {
                                  const prefix = String(r.id).startsWith("local-") ? "regal-tulip-result:" : "regal-tulip-review:";
                                  window.localStorage.setItem(`${prefix}${r.id}`, JSON.stringify(r));
                                } catch {
                                  // The editor will retrieve the record from Supabase.
                                }
                              }} className="rounded bg-sky-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-800">Edit</Link>
                              {isAdmin && <button onClick={() => handleDelete(r.id)} className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">Delete</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
