import { useReporting } from "../../context/ReportingContext";
import { useReportingSettings } from "../../context/ReportingSettingsContext";
import { useTheme } from "../../context/ReportingThemeContext";
import { Ic, ICONS } from "../shared";

export const CommentsStep = () => {
  const { comments, setComments, setPage, setSTab } = useReporting();
  const { cLib, cats } = useReportingSettings();
  const S = useTheme();
  const t = S.t;
  const addCmt = (text) => {
    const n = (comments.match(/^\d+\./gm) || []).length + 1;
    setComments(p => p ? p + `\n\n${n}. ${text}` : `1. ${text}`);
  };

  return (
    <div style={S.card}>
      <div style={S.cH}>
        <span style={S.cHT}>Comments & Recommendations</span>
        <button style={{ ...S.btnSm, color: t.accent }} onClick={() => { setPage("settings"); setSTab("comments"); }}>
          <Ic d={ICONS.settings} s={12} /> Manage
        </button>
      </div>
      <div style={{ padding: 16, display: "flex", gap: 16, minHeight: 380 }}>
        <div style={{ flex: "0 0 380px", background: t.surfaceDeep, borderRadius: 6, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${t.border}`, fontSize: 11, fontWeight: 600, color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>Quick Add</div>
          <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
            {cats.map(cat => (
              <div key={cat} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: t.accent, textTransform: "uppercase", letterSpacing: "0.06em", padding: "4px 8px" }}>{cat}</div>
                {cLib.filter(c => c.cat === cat && c.on).map(c => (
                  <div key={c.id} onClick={() => addCmt(c.text)} style={{ padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontSize: 12, color: t.textMuted, lineHeight: 1.5, display: "flex", gap: 8, alignItems: "flex-start" }}
                    onMouseEnter={e => e.currentTarget.style.background = t.accentHover}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ color: t.accent, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>+</span>
                    <span>{c.text}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>Report Comments</div>
          <textarea style={{ ...S.ta, flex: 1 }} value={comments} onChange={e => setComments(e.target.value)} placeholder="Click or type comments..." />
          <button style={{ ...S.btnSm, alignSelf: "flex-start" }} onClick={() => setComments("")}>Clear All</button>
        </div>
      </div>
    </div>
  );
};
