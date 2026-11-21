export type RegisteredPupil = { id: string; name: string; reg_no: string };
export function normalizePupilName(value: string): string {
  return value.trim().toLowerCase().split(/\s+/).sort().join(" ");
}
export function findSelectedPupil(pupils: RegisteredPupil[], name: string, selectedId: string): RegisteredPupil | undefined {
  const matches = pupils.filter(p => normalizePupilName(p.name) === normalizePupilName(name));
  return matches.find(p => p.id === selectedId) ?? (matches.length === 1 ? matches[0] : undefined);
}
