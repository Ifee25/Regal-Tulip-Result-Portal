export function resultSession(row: { assessment_data?: unknown }): string {
  try {
    const data = typeof row.assessment_data === "string" ? JSON.parse(row.assessment_data) : row.assessment_data;
    return data && typeof data.session === "string" ? data.session.trim() : "";
  } catch { return ""; }
}

export function matchesResultFilters(row: { class_name?: string; term?: string; assessment_data?: unknown }, filters: { className: string; session: string; term: string }): boolean {
  return (filters.className === "All" || row.class_name === filters.className)
    && (filters.session === "All" || (filters.session === "Unspecified" ? !resultSession(row) : resultSession(row) === filters.session))
    && (filters.term === "All" || row.term === filters.term);
}
