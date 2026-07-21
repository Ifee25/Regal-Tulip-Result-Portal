import type { StudentResult } from "@/types/result";

const demoResults: StudentResult[] = [
  {
    id: "demo-1",
    student_name: "Grace Okafor",
    class_name: "Primary 4",
    term: "1st Term",
    average_score: 82,
    created_at: "2026-07-01T09:30:00.000Z",
  },
  {
    id: "demo-2",
    student_name: "Moses Adebayo",
    class_name: "Nursery 2",
    term: "2nd Term",
    average_score: 76,
    created_at: "2026-07-03T10:00:00.000Z",
  },
  {
    id: "demo-3",
    student_name: "Amara Nwosu",
    class_name: "Primary 2",
    term: "3rd Term",
    average_score: 88,
    created_at: "2026-07-05T11:15:00.000Z",
  },
];

export function getDemoResults(query: { page?: number; pageSize?: number; q?: string; className?: string }) {
  const page = query.page && query.page > 0 ? query.page : 1;
  const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 10;

  const filtered = demoResults.filter((result) => {
    const matchesQuery = !query.q || result.student_name.toLowerCase().includes(query.q.toLowerCase());
    const matchesClass = !query.className || result.class_name.toLowerCase() === query.className.toLowerCase();
    return matchesQuery && matchesClass;
  });

  const from = (page - 1) * pageSize;
  const to = from + pageSize;

  return {
    data: filtered.slice(from, to),
    count: filtered.length,
  };
}

export function getDemoResultById(id: string) {
  return demoResults.find((result) => result.id === id) ?? null;
}
