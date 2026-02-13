import { useTheme } from "../../context/ReportingThemeContext";

export const FS_ = ({ label, value, onChange, options, display, allowEmpty, required, colorMap }) => {
  const S = useTheme();
  const t = S.t;
  const activeColor = colorMap && value ? colorMap[value] : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={S.label}>{label}{required && <span style={{ color: t.red, marginLeft: 3 }}>*</span>}</label>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {activeColor && (
          <div style={{ position: "absolute", left: 8, width: 10, height: 10, borderRadius: 99, background: activeColor, zIndex: 1, pointerEvents: "none" }} />
        )}
        <select style={{ ...S.input, width: "100%", ...(activeColor ? { paddingLeft: 24, color: activeColor, fontWeight: 600 } : {}) }} value={value} onChange={e => onChange(e.target.value)}>
          {allowEmpty && <option value="">Select...</option>}
          {options.map(o => <option key={o} value={o}>{display ? display(o) : o}</option>)}
        </select>
      </div>
    </div>
  );
};
