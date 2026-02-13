import { createContext, useContext, useMemo, useState } from "react";

const ThemeCtx = createContext();
export const useTheme = () => useContext(ThemeCtx);

const dark = {
  bg: "#12161f", surface: "#1c2030", surfaceAlt: "#161b26", surfaceDeep: "#1a1f2e", surfaceDeeper: "#141825",
  border: "#252a3a", borderSub: "#1e2333", borderLight: "#2a3040",
  text: "#e0dbd3", textSec: "#c8c2b6", textMuted: "#8a8580", textDim: "#7a756d", textFaint: "#5a6680", textGhost: "#3a4050",
  accent: "#00d2d3", accentBg: "rgba(0,210,211,0.12)", accentBorder: "rgba(0,210,211,0.3)", accentHover: "rgba(0,210,211,0.06)",
  green: "#3d8c5c", red: "#e74c3c", amber: "#e7a33e",
  toggleBg: "#3a3632", switchOn: "#00d2d3",
  modalBg: "rgba(0,0,0,0.6)", printBg: "rgba(0,0,0,0.7)",
};

const light = {
  bg: "#f0eeeb", surface: "#ffffff", surfaceAlt: "#f7f6f4", surfaceDeep: "#f0eeeb", surfaceDeeper: "#e8e6e2",
  border: "#d8d5cf", borderSub: "#e5e2dc", borderLight: "#d0cdc6",
  text: "#1a1816", textSec: "#3a3632", textMuted: "#6b665e", textDim: "#8a8580", textFaint: "#9b9589", textGhost: "#c0bdb6",
  accent: "#0097a7", accentBg: "rgba(0,151,167,0.08)", accentBorder: "rgba(0,151,167,0.25)", accentHover: "rgba(0,151,167,0.05)",
  green: "#2e7d4f", red: "#c0392b", amber: "#c8850a",
  toggleBg: "#d0cdc6", switchOn: "#0097a7",
  modalBg: "rgba(0,0,0,0.35)", printBg: "rgba(0,0,0,0.4)",
};

function T(isDark) {
  const t = isDark ? dark : light;
  return {
    shell: { minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'DM Sans',system-ui,sans-serif" },
    hdr: { background: t.surfaceAlt, borderBottom: `1px solid ${t.borderSub}`, padding: "12px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 },
    body: { maxWidth: 1000, margin: "0 auto", padding: "20px 24px 80px" },
    navB: { background: "none", border: "1px solid transparent", padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, color: t.textFaint, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit", transition: "0.15s" },
    navBA: { background: t.accentBg, borderColor: t.accentBorder, color: t.accent },
    tabs: { display: "flex", gap: 0, borderBottom: `2px solid ${t.borderSub}`, marginBottom: 20 },
    tab: { background: "none", border: "none", borderBottom: "2px solid transparent", marginBottom: -2, padding: "10px 18px", fontSize: 12, fontWeight: 500, color: t.textFaint, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", transition: "0.15s" },
    tabA: { color: t.accent, borderBottomColor: t.accent },
    tabD: { color: t.green },
    tabN: { width: 22, height: 22, borderRadius: 11, background: t.border, color: t.textFaint, fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" },
    tabNA: { background: t.accent, color: isDark ? "#12161f" : "#fff" },
    tabND: { background: t.green, color: "#fff" },
    card: { background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, marginBottom: 12, overflow: "hidden" },
    cH: { background: t.surfaceAlt, padding: "10px 16px", borderBottom: `1px solid ${t.borderSub}`, display: "flex", alignItems: "center", justifyContent: "space-between" },
    cHT: { fontSize: 12, fontWeight: 600, color: t.textSec, letterSpacing: "0.04em", textTransform: "uppercase" },
    g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" },
    g3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px 20px" },
    fs: { display: "flex", flexDirection: "column", gap: 10 },
    label: { fontSize: 10, fontWeight: 600, color: t.textFaint, textTransform: "uppercase", letterSpacing: "0.04em" },
    input: { fontFamily: "'DM Sans',system-ui", fontSize: 13, padding: "8px 10px", border: `1px solid ${t.border}`, borderRadius: 5, background: t.surfaceDeep, color: t.text, outline: "none", width: "100%", transition: "border-color 0.15s" },
    inputDk: { fontFamily: "monospace", fontSize: 13, padding: "6px 10px", border: `1px solid ${t.border}`, borderRadius: 4, background: t.surfaceDeeper, color: t.text, outline: "none", width: "100%" },
    ta: { fontFamily: "'DM Sans',system-ui", fontSize: 13, padding: 12, border: `1px solid ${t.border}`, borderRadius: 5, background: t.surfaceDeep, color: t.text, outline: "none", resize: "none", lineHeight: 1.7 },
    computed: { fontFamily: "monospace", fontSize: 13, padding: "8px 10px", background: t.surfaceDeeper, border: `1px solid ${t.borderSub}`, borderRadius: 5 },
    btnCyan: { fontFamily: "inherit", fontSize: 12, fontWeight: 600, padding: "7px 14px", border: `1px solid ${t.accentBorder}`, borderRadius: 5, background: t.accentBg, color: t.accent, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "0.15s" },
    btnOut: { fontFamily: "inherit", fontSize: 12, fontWeight: 500, padding: "7px 14px", border: `1px solid ${t.borderLight}`, borderRadius: 5, background: "transparent", color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "0.15s" },
    btnSm: { fontFamily: "inherit", fontSize: 11, fontWeight: 500, padding: "4px 10px", background: "none", border: "none", color: t.textDim, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 },
    btnIc: { background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" },
    modal: { position: "fixed", inset: 0, background: t.modalBg, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
    printOv: { position: "fixed", inset: 0, background: t.printBg, zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto" },
    t,
  };
}

export const ReportingThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true);
  const S = useMemo(() => T(isDark), [isDark]);

  return (
    <ThemeCtx.Provider value={{ ...S, isDark, setIsDark }}>
      {children}
    </ThemeCtx.Provider>
  );
};
