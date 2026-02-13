import { useTheme } from "../../context/ReportingThemeContext";

export const F_ = ({ label, value, onChange, type = "text", placeholder = "", required }) => {
  const S = useTheme();
  const t = S.t;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={S.label}>{label}{required && <span style={{ color: t.red, marginLeft: 3 }}>*</span>}</label>
      <input style={S.input} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} onFocus={e => e.target.select()} />
    </div>
  );
};
