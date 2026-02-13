import { useTheme } from "../../context/ReportingThemeContext";

export const SL_ = ({ text }) => {
  const S = useTheme();
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: S.t.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
      {text}
    </div>
  );
};
