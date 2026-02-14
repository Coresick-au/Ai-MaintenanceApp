import { useState } from "react";
import { useReporting } from "../../context/ReportingContext";
import { useReportingSettings } from "../../context/ReportingSettingsContext";
import { useTheme } from "../../context/ReportingThemeContext";
import { Ic, ICONS } from "../shared";

const CONDITION_COLORS = ["#22c55e", "#eab308", "#f97316", "#ef4444", "#3b82f6", "#a855f7", "#ec4899", "#64748b"];

const ddMeta = {
  serviceTypes: "Service Types", scaleTypes: "Scale Types (BW)", integratorTypes: "Integrator Types (BW)",
  speedInputs: "Speed Inputs (BW)", billetWeightTypes: "Billet Weight Types (BW)", rollerTypes: "Roller Types (BW)",
  tmdFrameTypes: "Frame Types (TMD)", tmdControllers: "Controllers (TMD)", tmdSpeedInputs: "Speed Inputs (TMD)",
};

export const SettingsDropdowns = () => {
  const { showToast } = useReporting();
  const { dd, setDd, units, customEqTypes, addDropdownItem, removeDropdownItem, addUnit, removeUnit, condColors, setConditionColor } = useReportingSettings();
  const S = useTheme();
  const t = S.t;
  const [ddNewItem, setDdNewItem] = useState("");
  const [ddFocus, setDdFocus] = useState(null);
  const [colorPickerFor, setColorPickerFor] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null); // { key, index } or { type: "unit", value }
  const [newDdName, setNewDdName] = useState("");

  // Build labels for custom dropdown keys from equipment types' asset fields
  const customDdLabels = {};
  (customEqTypes || []).forEach(eq => {
    (eq.assetFields || []).forEach(f => {
      if (f.type === "dropdown" && f.dropdownKey && !ddMeta[f.dropdownKey] && f.dropdownKey !== "conditions") {
        customDdLabels[f.dropdownKey] = `${f.label} (${eq.shortLabel})`;
      }
    });
  });

  // Also detect any extra custom keys in dd that aren't in ddMeta or conditions
  const extraDdKeys = Object.keys(dd).filter(k => k !== "conditions" && !ddMeta[k] && Array.isArray(dd[k]));

  // Combine: built-in + equipment-type-linked + orphan custom keys
  const customKeys = new Set([...Object.keys(customDdLabels), ...extraDdKeys]);
  const allDdEntries = [
    ...Object.entries(ddMeta),
    ...[...customKeys].map(key => [key, customDdLabels[key] || key]),
  ];

  const handleCreateDropdown = () => {
    const key = newDdName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (!key) return;
    if (dd[key] || ddMeta[key]) { showToast("Dropdown already exists", "info"); return; }
    setDd(prev => ({ ...prev, [key]: [] }));
    setNewDdName("");
    showToast("Dropdown created", "success");
  };

  const isDelConfirm = (key, index) => confirmDel && confirmDel.key === key && confirmDel.index === index;
  const isUnitDelConfirm = (u) => confirmDel && confirmDel.type === "unit" && confirmDel.value === u;

  const handleRemoveItem = (key, index) => {
    removeDropdownItem(key, index);
    setConfirmDel(null);
    showToast("Item removed", "success");
  };

  const handleAddItem = (key) => {
    if (ddFocus === key && ddNewItem.trim()) {
      // Ensure the key exists in dd (for custom keys that might not have been auto-created yet)
      if (!dd[key]) setDd(prev => ({ ...prev, [key]: [] }));
      addDropdownItem(key, ddNewItem);
      setDdNewItem("");
      showToast("Item added", "success");
    }
  };

  const handleRemoveUnit = (u) => {
    removeUnit(u);
    setConfirmDel(null);
    showToast("Unit removed", "success");
  };

  const handleAddUnit = () => {
    if (ddFocus === "units" && ddNewItem.trim() && !units.includes(ddNewItem.trim())) {
      addUnit(ddNewItem);
      setDdNewItem("");
      showToast("Unit added", "success");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Equipment Dropdowns</h2>
        <p style={{ fontSize: 13, color: t.textDim }}>Add or remove dropdown options.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Standard + custom dropdown cards */}
        {allDdEntries.map(([key, label]) => (
          <div key={key} style={S.card}>
            <div style={S.cH}>
              <span style={S.cHT}>{label}</span>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {customKeys.has(key) && <span style={{ fontSize: 8, fontWeight: 600, padding: "2px 6px", borderRadius: 99, background: t.surfaceDeep, color: t.textFaint }}>CUSTOM</span>}
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: t.accentBg, color: t.accent }}>{(dd[key] || []).length}</span>
              </div>
            </div>
            {(dd[key] || []).map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", borderBottom: `1px solid ${t.borderSub}` }}>
                <span style={{ flex: 1, fontSize: 13, color: t.textSec }}>{item}</span>
                {isDelConfirm(key, i) ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button style={{ ...S.btnSm, color: t.red, padding: "2px 8px", fontSize: 10 }} onClick={() => handleRemoveItem(key, i)}>Confirm</button>
                    <button style={{ ...S.btnSm, padding: "2px 8px", fontSize: 10 }} onClick={() => setConfirmDel(null)}>Cancel</button>
                  </div>
                ) : (
                  <button style={S.btnIc} onClick={() => setConfirmDel({ key, index: i })}><Ic d={ICONS.x} s={12} c={t.red} /></button>
                )}
              </div>
            ))}
            <div style={{ padding: "8px 12px", display: "flex", gap: 8 }}>
              <input style={{ ...S.input, flex: 1, fontSize: 12 }} placeholder="Add..." value={ddFocus === key ? ddNewItem : ""} onFocus={() => setDdFocus(key)}
                onChange={e => { setDdFocus(key); setDdNewItem(e.target.value); }}
                onKeyDown={e => { if (e.key === "Enter" && ddNewItem.trim()) { handleAddItem(key); } }} />
              <button style={{ ...S.btnCyan, padding: "4px 10px", fontSize: 11 }} onClick={() => handleAddItem(key)}>
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
            const isConfirming = isDelConfirm("conditions", i);
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
                  {isConfirming ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button style={{ ...S.btnSm, color: t.red, padding: "2px 8px", fontSize: 10 }} onClick={() => handleRemoveItem("conditions", i)}>Confirm</button>
                      <button style={{ ...S.btnSm, padding: "2px 8px", fontSize: 10 }} onClick={() => setConfirmDel(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button style={S.btnIc} onClick={() => setConfirmDel({ key: "conditions", index: i })}><Ic d={ICONS.x} s={12} c={t.red} /></button>
                  )}
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
              onKeyDown={e => { if (e.key === "Enter" && ddNewItem.trim()) { handleAddItem("conditions"); } }} />
            <button style={{ ...S.btnCyan, padding: "4px 10px", fontSize: 11 }} onClick={() => handleAddItem("conditions")}>
              <Ic d={ICONS.plus} s={12} />
            </button>
          </div>
        </div>

        {/* Create new dropdown card */}
        <div style={{ ...S.card, border: `2px dashed ${t.border}` }}>
          <div style={{ padding: 16, textAlign: "center" }}>
            <Ic d={ICONS.plus} s={20} c={t.accent} />
            <p style={{ fontSize: 12, fontWeight: 600, color: t.textSec, marginTop: 6, marginBottom: 8 }}>Create Dropdown</p>
            <div style={{ display: "flex", gap: 8, maxWidth: 280, margin: "0 auto" }}>
              <input
                style={{ ...S.input, flex: 1, fontSize: 12 }}
                placeholder="Dropdown name..."
                value={newDdName}
                onChange={e => setNewDdName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCreateDropdown(); }}
              />
              <button style={{ ...S.btnCyan, padding: "4px 10px", fontSize: 11 }} onClick={handleCreateDropdown}>
                <Ic d={ICONS.plus} s={12} />
              </button>
            </div>
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
                {isUnitDelConfirm(u) ? (
                  <>
                    <button style={{ fontSize: 9, color: t.red, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }} onClick={() => handleRemoveUnit(u)}>Yes</button>
                    <button style={{ fontSize: 9, color: t.textMuted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }} onClick={() => setConfirmDel(null)}>No</button>
                  </>
                ) : (
                  <button style={{ ...S.btnIc, padding: 0 }} onClick={() => setConfirmDel({ type: "unit", value: u })}><Ic d={ICONS.x} s={10} c={t.red} /></button>
                )}
              </span>
            ))}
          </div>
          <div style={{ padding: "8px 12px", borderTop: `1px solid ${t.borderSub}`, display: "flex", gap: 8 }}>
            <input style={{ ...S.input, flex: 1, fontSize: 12 }} placeholder="Add custom unit..." value={ddFocus === "units" ? ddNewItem : ""} onFocus={() => setDdFocus("units")}
              onChange={e => { setDdFocus("units"); setDdNewItem(e.target.value); }}
              onKeyDown={e => { if (e.key === "Enter") handleAddUnit(); }} />
            <button style={{ ...S.btnCyan, padding: "4px 10px", fontSize: 11 }} onClick={handleAddUnit}>
              <Ic d={ICONS.plus} s={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
