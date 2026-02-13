import { useTheme } from "../../context/ReportingThemeContext";

export const FC_ = ({ label, value, change }) => {
  const S = useTheme();
  const n = parseFloat(change);
  const color = isNaN(n) || n === 0 ? S.t.textMuted : n > 0 ? S.t.green : S.t.red;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={S.label}>{label}</label>
      <div style={{ ...S.computed, color }}>{value}</div>
    </div>
  );
};
