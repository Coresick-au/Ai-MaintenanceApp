import { useEffect } from "react";
import { useTheme } from "../../context/ReportingThemeContext";
import { Ic, ICONS } from "./Icon";

const TOAST_TYPES = {
  success: { icon: ICONS.check, colorKey: "green" },
  error: { icon: ICONS.x, colorKey: "red" },
  info: { icon: ICONS.file, colorKey: "accent" },
};

export const Toast = ({ message, type = "success", onDismiss }) => {
  const { t } = useTheme();

  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const cfg = TOAST_TYPES[type] || TOAST_TYPES.success;
  const color = t[cfg.colorKey] || t.accent;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 18px",
        borderRadius: 8,
        background: t.surface,
        border: `1px solid ${color}44`,
        boxShadow: `0 4px 20px ${t.shadow || "rgba(0,0,0,0.3)"}`,
        color: t.text,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: "'DM Sans', sans-serif",
        animation: "toast-in 0.25s ease-out",
      }}
    >
      <Ic d={cfg.icon} s={16} c={color} />
      {message}
      <style>{`@keyframes toast-in { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};
