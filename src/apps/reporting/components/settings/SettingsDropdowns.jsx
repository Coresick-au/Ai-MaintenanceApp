import { useState } from "react";
import { useReportingSettings } from "../../context/ReportingSettingsContext";
import { useTheme } from "../../context/ReportingThemeContext";
import { Ic, ICONS } from "../shared";

const CONDITION_COLORS = ["#22c55e", "#eab308", "#f97316", "#ef4444", "#3b82f6", "#a855f7", "#ec4899", "#64748b"];

const ddMeta = {
  serviceTypes: "Service Types", scaleTypes: "Scale Types", integratorTypes: "Integrator Types",
  speedInputs: "Speed Inputs", billetWeightTypes: "Billet Weight Types", rollerTypes: "Roller Types",
};

export const SettingsDropdowns = () => {
  const { dd, units, addDropdownItem, removeDropdownItem, addUnit, removeUnit, condColors, setConditionColor } = useReportingSettings();
  const S = useTheme();
  const t = S.t;
  const [ddNewItem, setDdNewItem] = useState("");
  const [ddFocus, setDdFocus] = useState(null);
  const [colorPickerFor, setColorPickerFor] = useState(null);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Equipment Dropdowns</h2>
        <p style={{ fontSize: 13, color: t.textDim }}>Add or remove dropdown options.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Standard dropdown cards */}
        {Object.entries(ddMeta).map(([key, label]) => (
          <div key={key} style={S.card}>
            <div style={S.cH}>
              <span style={S.cHT}>{label}</span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: t.accentBg, color: t.accent }}>{dd[key].length}</span>
            </div>
            {dd[key].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", borderBottom: `1px solid ${t.borderSub}` }}>
                <span style={{ flex: 1, fontSize: 13, color: t.textSec }}>{item}</span>
                <button style={S.btnIc} onClick={() => removeDropdownItem(key, i)}><Ic d={ICONS.x} s={12} c={t.red} /></button>
              </div>
            ))}
            <div style={{ padding: "8px 12px", display: "flex", gap: 8 }}>
              <input style={{ ...S.input, flex: 1, fontSize: 12 }} placeholder="Add..." value={ddFocus === key ? ddNewItem : ""} onFocus={() => setDdFocus(key)}
                onChange={e => { setDdFocus(key); setDdNewItem(e.target.value); }}
                onKeyDown={e => { if (e.key === "Enter" && ddNewItem.trim()) { addDropdownItem(key, ddNewItem); setDdNewItem(""); } }} />
              <button style={{ ...S.btnCyan, padding: "4px 10px", fontSize: 11 }} onClick={() => { if (ddFocus === key && ddNewItem.trim()) { addDropdownItem(key, ddNewItem); setDdNewItem(""); } }}>
                <Ic d={ICONS.plus} s={12} />
              </button>
            </div>
          </div>
        ))}

        {/* Conditions card with color support */}
        <div style={S.card}>
          <div style={S.cH}>
            <span style={S.cHT}>Conditions</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: t.accentBg, color: t.accent }}>{dd.conditions.length}</span>
          </div>
          {dd.conditions.map((item, i) => {
            const color = condColors[item];
            const isPickerOpen = colorPickerFor === item;
            return (
              <div key={i} style={{ borderBottom: `1px solid ${t.borderSub}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px" }}>
                  {/* Color dot / picker toggle */}
                  <button
                    style={{ width: 18, height: 18, borderRadius: 99, border: color ? `2px solid ${color}` : `2px dashed ${t.borderLight}`, background: color || "transparent", cursor: "pointer", flexShrink: 0, transition: "all 0.15s" }}
                    onClick={() => setColorPickerFor(isPickerOpen ? null : item)}
                    title={color ? "Change colour" : "Add colour"}
                  />
                  <span style={{ flex: 1, fontSize: 13, color: color || t.textSec, fontWeight: color ? 600 : 400 }}>{item}</span>
                  <button style={S.btnIc} onClick={() => removeDropdownItem("conditions", i)}><Ic d={ICONS.x} s={12} c={t.red} /></button>
                </div>
                {/* Color picker row */}
                {isPickerOpen && (
                  <div style={{ padding: "4px 14px 10px", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    {CONDITION_COLORS.map(c => (
                      <button
                        key={c}
                        style={{
                          width: 22, height: 22, borderRadius: 99, background: c, border: condColors[item] === c ? "2px solid #fff" : "2px solid transparent",
                          outline: condColors[item] === c ? `2px solid ${c}` : "none", cursor: "pointer", transition: "all 0.15s",
                        }}
                        onClick={() => { setConditionColor(item, c); setColorPickerFor(null); }}
                      />
                    ))}
                    {/* Remove color button */}
                    {color && (
                      <button
                        style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, border: `1px solid ${t.border}`, background: "transparent", color: t.textMuted, cursor: "pointer", fontFamily: "inherit", marginLeft: 4 }}
                        onClick={() => { setConditionColor(item, null); setColorPickerFor(null); }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ padding: "8px 12px", display: "flex", gap: 8 }}>
            <input style={{ ...S.input, flex: 1, fontSize: 12 }} placeholder="Add..." value={ddFocus === "conditions" ? ddNewItem : ""} onFocus={() => setDdFocus("conditions")}
              onChange={e => { setDdFocus("conditions"); setDdNewItem(e.target.value); }}
              onKeyDown={e => { if (e.key === "Enter" && ddNewItem.trim()) { addDropdownItem("conditions", ddNewItem); setDdNewItem(""); } }} />
            <button style={{ ...S.btnCyan, padding: "4px 10px", fontSize: 11 }} onClick={() => { if (ddFocus === "conditions" && ddNewItem.trim()) { addDropdownItem("conditions", ddNewItem); setDdNewItem(""); } }}>
              <Ic d={ICONS.plus} s={12} />
            </button>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={S.card}>
          <div style={S.cH}>
            <span style={S.cHT}>Parameter Units</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: t.accentBg, color: t.accent }}>{units.filter(u => u).length}</span>
          </div>
          <div style={{ padding: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {units.filter(u => u).map((u, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, padding: "4px 10px", background: t.surfaceDeep, border: `1px solid ${t.borderSub}`, borderRadius: 4, color: t.textSec }}>
                {u}
                <button style={{ ...S.btnIc, padding: 0 }} onClick={() => removeUnit(u)}><Ic d={ICONS.x} s={10} c={t.red} /></button>
              </span>
            ))}
          </div>
          <div style={{ padding: "8px 12px", borderTop: `1px solid ${t.borderSub}`, display: "flex", gap: 8 }}>
            <input style={{ ...S.input, flex: 1, fontSize: 12 }} placeholder="Add custom unit..." value={ddFocus === "units" ? ddNewItem : ""} onFocus={() => setDdFocus("units")}
              onChange={e => { setDdFocus("units"); setDdNewItem(e.target.value); }}
              onKeyDown={e => { if (e.key === "Enter" && ddNewItem.trim() && !units.includes(ddNewItem.trim())) { addUnit(ddNewItem); setDdNewItem(""); } }} />
            <button style={{ ...S.btnCyan, padding: "4px 10px", fontSize: 11 }} onClick={() => { if (ddFocus === "units" && ddNewItem.trim() && !units.includes(ddNewItem.trim())) { addUnit(ddNewItem); setDdNewItem(""); } }}>
              <Ic d={ICONS.plus} s={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
