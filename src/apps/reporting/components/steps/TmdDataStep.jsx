import { useReporting } from "../../context/ReportingContext";
import { useTheme } from "../../context/ReportingThemeContext";
import { Ic, ICONS } from "../shared";
import { calcDiff } from "../../utils/reportUtils";

export const TmdDataStep = () => {
  const { selTpl, intD, setIntD, setPage, setSTab } = useReporting();
  const S = useTheme();
  const t = S.t;

  const calParams = (selTpl?.params || []).filter(p => (p.type || "cal") === "cal");
  const valParams = (selTpl?.params || []).filter(p => p.type === "val");

  return (
    <>
      {/* Calibration params: As Found / As Left / Change */}
      {calParams.length > 0 && (
        <div style={S.card}>
          <div style={S.cH}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={S.cHT}>Calibration Data</span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: t.accentBg, color: t.accent }}>{selTpl?.name}</span>
            </div>
            <button style={{ ...S.btnSm, color: t.accent }} onClick={() => { setPage("settings"); setSTab("templates"); }}>
              <Ic d={ICONS.settings} s={12} /> Templates
            </button>
          </div>
          <div style={{ padding: 0, overflow: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr 140px", padding: "10px 16px", borderBottom: `1px solid ${t.border}`, background: t.surfaceDeep }}>
              {["Parameter", "As Found", "As Left", "Change"].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
              ))}
            </div>
            {calParams.map(p => {
              const af = intD[p.id]?.af || "", al = intD[p.id]?.al || "", d = calcDiff(af, al);
              return (
                <div key={p.id} style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr 140px", padding: "6px 16px", borderBottom: `1px solid ${t.borderSub}`, alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: t.textSec }}>{p.name} {p.unit && <span style={{ color: t.textFaint, fontSize: 11 }}>({p.unit})</span>}</span>
                  <div style={{ paddingRight: 12 }}><input style={S.inputDk} value={af} placeholder={p.unit || "\u2014"} onChange={e => setIntD({ ...intD, [p.id]: { ...intD[p.id], af: e.target.value } })} /></div>
                  <div style={{ paddingRight: 12 }}><input style={S.inputDk} value={al} placeholder={p.unit || "\u2014"} onChange={e => setIntD({ ...intD, [p.id]: { ...intD[p.id], al: e.target.value } })} /></div>
                  <span style={{ fontSize: 12, fontFamily: "monospace", color: d.diff === "-" ? t.textFaint : parseFloat(d.diff) === 0 ? t.green : t.amber }}>{d.diff}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Single-value params: 2-column grid */}
      {valParams.length > 0 && (
        <div style={S.card}>
          <div style={S.cH}><span style={S.cHT}>Parameters</span></div>
          <div style={{ padding: 16 }}>
            <div style={S.g2}>
              {valParams.map(p => (
                <div key={p.id}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: t.textFaint, marginBottom: 4, display: "block" }}>{p.name}</label>
                  <input
                    style={{ ...S.inputDk, width: "100%" }}
                    value={intD[p.id]?.val || ""}
                    placeholder={p.unit || "\u2014"}
                    onChange={e => setIntD({ ...intD, [p.id]: { val: e.target.value } })}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state when no template selected */}
      {!selTpl && (
        <div style={S.card}>
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>No template selected</div>
            <div style={{ fontSize: 12 }}>Select a template on the General step to enter data.</div>
          </div>
        </div>
      )}
    </>
  );
};
