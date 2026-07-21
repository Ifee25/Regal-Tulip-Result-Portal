export function getPrimaryRemark(total: number, hasScore = true): string {
  if (!hasScore) return "";
  if (total >= 85) return "EXCELLENT";
  if (total >= 70) return "VERY GOOD";
  if (total >= 55) return "GOOD";
  if (total >= 40) return "PASS";
  return "FAIL";
}
