export const uid = () => Math.random().toString(36).slice(2, 10);

export function calcDiff(a, b) {
  const an = parseFloat(a), bn = parseFloat(b);
  if (isNaN(an) || isNaN(bn)) return { diff: "-", pct: "-" };
  const d = bn - an;
  const p = an !== 0 ? ((d / an) * 100) : 0;
  return { diff: d.toFixed(3), pct: p.toFixed(2) };
}

export function fmtDate(s) {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function addMonths(s, m) {
  if (!s || !m) return "";
  const d = new Date(s); d.setMonth(d.getMonth() + parseInt(m));
  return d.toISOString().split("T")[0];
}
