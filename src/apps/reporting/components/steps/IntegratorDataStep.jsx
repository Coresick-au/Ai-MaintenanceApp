import { useReporting } from "../../context/ReportingContext";
import { useTheme } from "../../context/ReportingThemeContext";
import { Ic, ICONS } from "../shared";
import { calcDiff } from "../../utils/reportUtils";

export const IntegratorDataStep = () => {
  const { selTpl, intD, setIntD, setPage, setSTab } = useReporting();
  const S = useTheme();
  const t = S.t;

  const toggleIncPct = (pId) => {
    setIntD(prev => ({ ...prev, [pId]: { ...prev[pId], incPct: !prev[pId]?.incPct } }));
  };

  return (
    <div style={S.card}>
      <div style={S.cH}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={S.cHT}>Integrator Data</span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: t.accentBg, color: t.accent }}>{selTpl?.name}</span>
        </div>
        <button style={{ ...S.btnSm, color: t.accent }} onClick={() => { setPage("settings"); setSTab("templates"); }}>
          <Ic d={ICONS.settings} s={12} /> Templates
        </button>
      </div>
      <div style={{ padding: 0, overflow: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "250px 1fr 1fr 120px 100px 50px", padding: "10px 16px", borderBottom: `1px solid ${t.border}`, background: t.surfaceDeep }}>
          {["Parameter", "As Found", "As Left", "Difference", "% Change"].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
          ))}
          <span style={{ fontSize: 10, fontWeight: 700, color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }} title="Include % Change in PDF">PDF</span>
        </div>
        {selTpl?.params.map(p => {
          const af = intD[p.id]?.af || "", al = intD[p.id]?.al || "", d = calcDiff(af, al);
          const incPct = !!intD[p.id]?.incPct;
          return (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "250px 1fr 1fr 120px 100px 50px", padding: "6px 16px", borderBottom: `1px solid ${t.borderSub}`, alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: t.textSec }}>{p.name} {p.unit && <span style={{ color: t.textFaint, fontSize: 11 }}>({p.unit})</span>}</span>
              <div style={{ paddingRight: 12 }}><input style={S.inputDk} value={af} placeholder={p.unit || "\u2014"} onChange={e => setIntD({ ...intD, [p.id]: { ...intD[p.id], af: e.target.value } })} /></div>
              <div style={{ paddingRight: 12 }}><input style={S.inputDk} value={al} placeholder={p.unit || "\u2014"} onChange={e => setIntD({ ...intD, [p.id]: { ...intD[p.id], al: e.target.value } })} /></div>
              <span style={{ fontSize: 12, fontFamily: "monospace", color: d.diff === "-" ? t.textFaint : t.textSec }}>{d.diff}</span>
              <span style={{ fontSize: 12, fontFamily: "monospace", color: d.pct === "-" ? t.textFaint : parseFloat(d.pct) === 0 ? t.green : t.amber }}>{d.pct !== "-" ? d.pct + "%" : "-"}</span>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <input
                  type="checkbox"
                  checked={incPct}
                  onChange={() => toggleIncPct(p.id)}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: t.accent }}
                  title="Include % change in PDF"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
