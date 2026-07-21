"use server";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getDemoResults } from "@/lib/demoResults";
import type { StudentResult } from "@/types/result";

type Query = { page?: number; pageSize?: number; q?: string; className?: string };

async function getStudentResults(query: Query): Promise<{ data: StudentResult[]; count: number }> {
  const client = supabase;
  if (!client) {
    console.warn("Supabase client not configured; using demo results.");
    return getDemoResults(query);
  }

  const page = query.page && query.page > 0 ? query.page : 1;
  const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    let builder = client.from("students").select("id, student_name, class_name, term, average_score, created_at", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);

    if (query.q) {
      builder = builder.ilike("student_name", `%${query.q}%`);
    }

    if (query.className) {
      builder = builder.eq("class_name", query.className);
    }

    const { data, error, count } = await builder;
    if (error) {
      console.warn("Supabase fetch error; using demo results instead.", error);
      return getDemoResults(query);
    }

    return { data: (data ?? []) as StudentResult[], count: count ?? 0 };
  } catch (error) {
    console.warn("Supabase request failed; using demo results instead.", error);
    return getDemoResults(query);
  }
}

export default async function ResultsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const page = Number(Array.isArray(searchParams?.page) ? searchParams?.page[0] : searchParams?.page) || 1;
  const pageSize = Number(Array.isArray(searchParams?.pageSize) ? searchParams?.pageSize[0] : searchParams?.pageSize) || 10;
  const q = Array.isArray(searchParams?.q) ? searchParams?.q[0] : searchParams?.q;
  const className = Array.isArray(searchParams?.className) ? searchParams?.className[0] : searchParams?.className;

  const { data: results, count } = await getStudentResults({ page, pageSize, q: q ?? undefined, className: className ?? undefined });

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-800 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-900">Result portal</p>
            <h1 className="mt-2 text-2xl font-bold text-blue-900 sm:text-3xl">Student Results</h1>
          </div>
          <Link href="/" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100">Back home</Link>
        </div>

        <form method="get" className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_160px_96px_auto]">
          <input defaultValue={q ?? ""} name="q" placeholder="Search student" className="w-full rounded border px-3 py-2" />
          <input defaultValue={className ?? ""} name="className" placeholder="Class" className="w-full rounded border px-3 py-2" />
          <input defaultValue={pageSize} name="pageSize" type="number" className="w-full rounded border px-3 py-2" />
          <button className="rounded bg-sky-500 px-4 py-2 text-white hover:bg-sky-600">Filter</button>
        </form>

        <div className="max-w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm [-webkit-overflow-scrolling:touch]">
          <table className="min-w-[650px] divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Class</th>
                <th className="px-4 py-3 font-semibold">Term</th>
                <th className="px-4 py-3 font-semibold">Average</th>
                <th className="px-4 py-3 font-semibold">&nbsp;</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">No results found.</td>
                </tr>
              ) : (
                results.map((result) => (
                  <tr key={result.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{result.student_name}</td>
                    <td className="px-4 py-3">{result.class_name}</td>
                    <td className="px-4 py-3">{result.term}</td>
                    <td className="px-4 py-3 font-semibold text-sky-600">{result.average_score}%</td>
                    <td className="px-4 py-3 text-right"><a className="text-sm text-slate-600" href={`/results/${result.id}`}>View</a></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-3 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">
          <div className="text-sm text-slate-600">Page {page} / {totalPages} • {count} results</div>
          <div className="flex gap-2">
            <a className={`rounded border px-3 py-1 ${page <= 1 ? "opacity-50 pointer-events-none" : ""}`} href={`?page=${page - 1}&pageSize=${pageSize}${q ? `&q=${encodeURIComponent(q)}` : ""}${className ? `&className=${encodeURIComponent(className)}` : ""}`}>Prev</a>
            <a className={`rounded border px-3 py-1 ${page >= totalPages ? "opacity-50 pointer-events-none" : ""}`} href={`?page=${page + 1}&pageSize=${pageSize}${q ? `&q=${encodeURIComponent(q)}` : ""}${className ? `&className=${encodeURIComponent(className)}` : ""}`}>Next</a>
          </div>
        </div>
      </div>
    </main>
  );
}
