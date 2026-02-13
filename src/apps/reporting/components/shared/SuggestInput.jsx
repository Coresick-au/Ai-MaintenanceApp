import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../../context/ReportingThemeContext";

export const SuggestInput = ({ value, onChange, onBlur, options, placeholder, style }) => {
  const S = useTheme();
  const t = S.t;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef(null);
  const inputRef = useRef(null);
  const filtered = options.filter(o => o && o.toLowerCase().includes((q || value || "").toLowerCase()));

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Update dropdown position when open
  useEffect(() => {
    if (open && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 2, left: rect.left, width: rect.width });
    }
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        style={style || S.inputDk}
        value={value}
        placeholder={placeholder}
        onFocus={() => { setOpen(true); setQ(""); }}
        onChange={e => { onChange(e.target.value); setQ(e.target.value); setOpen(true); }}
        onBlur={() => { setTimeout(() => setOpen(false), 150); if (onBlur) setTimeout(onBlur, 150); }}
      />
      {open && filtered.length > 0 && createPortal(
        <div style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999, maxHeight: 180, overflowY: "auto", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 5, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
          {filtered.map(o => (
            <div key={o} style={{ padding: "6px 10px", fontSize: 12, color: t.textSec, cursor: "pointer" }}
              onMouseDown={e => { e.preventDefault(); onChange(o); setOpen(false); }}
              onMouseEnter={e => e.currentTarget.style.background = t.accentHover}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              {o}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};
