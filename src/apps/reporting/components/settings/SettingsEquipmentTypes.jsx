import { useState, useRef } from "react";
import { useReporting } from "../../context/ReportingContext";
import { useReportingSettings } from "../../context/ReportingSettingsContext";
import { useTheme } from "../../context/ReportingThemeContext";
import { Ic, ICONS } from "../shared";
import { uid } from "../../utils/reportUtils";
import { getAllEquipmentTypes } from "../../data/equipmentTypes";

const AVAILABLE_STEPS = [
  { key: "general", label: "General", required: true },
  { key: "templateData", label: "Data", required: false },
  { key: "comments", label: "Comments", required: false },
  { key: "assetInfo", label: "Asset Info", required: false },
];

const DEFAULT_STEPS = ["general", "templateData", "comments", "assetInfo"];

const toKey = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export const SettingsEquipmentTypes = () => {
  const { showToast } = useReporting();
  const { dd, customEqTypes, addCustomEqType, updateCustomEqType, deleteCustomEqType } = useReportingSettings();
  const S = useTheme();
  const t = S.t;

  // Build list of available dropdown keys from dd (excluding 'conditions')
  const existingDdKeys = Object.keys(dd).filter(k => k !== "conditions" && Array.isArray(dd[k]));

  const [showEditor, setShowEditor] = useState(false);
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [selectedSteps, setSelectedSteps] = useState(DEFAULT_STEPS);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [newDdKeyFor, setNewDdKeyFor] = useState(null); // index of field creating a new key
  const [newDdKeyValue, setNewDdKeyValue] = useState("");
  const initialDraftRef = useRef(null);

  const allTypes = getAllEquipmentTypes();

  const isDirty = () => {
    if (!draft || !initialDraftRef.current) return false;
    return JSON.stringify({ ...draft, selectedSteps }) !== JSON.stringify(initialDraftRef.current);
  };

  const openNew = () => {
    const d = {
      label: "", shortLabel: "", reportCodePrefix: "", pdfTitle: "",
      assetFields: [{ id: uid(), key: "", label: "", type: "text", dropdownKey: "" }],
    };
    const steps = [...DEFAULT_STEPS];
    setDraft(d);
    setSelectedSteps(steps);
    initialDraftRef.current = JSON.parse(JSON.stringify({ ...d, selectedSteps: steps }));
    setEditId(null);
    setShowEditor(true);
  };

  const openEdit = (eq) => {
    const d = {
      label: eq.label, shortLabel: eq.shortLabel, reportCodePrefix: eq.reportCodePrefix, pdfTitle: eq.pdfTitle,
      assetFields: (eq.assetFields || []).map(f => ({ ...f })),
    };
    const steps = (eq.steps || []).map(s => s.key);
    setDraft(d);
    setSelectedSteps(steps);
    initialDraftRef.current = JSON.parse(JSON.stringify({ ...d, selectedSteps: steps }));
    setEditId(eq.id);
    setShowEditor(true);
  };

  const handleSave = () => {
    if (!draft.label || !draft.shortLabel || !draft.reportCodePrefix) return;
    const steps = AVAILABLE_STEPS.filter(s => selectedSteps.includes(s.key)).map(s => ({ key: s.key, label: s.label }));
    const data = {
      ...draft,
      pdfTitle: draft.pdfTitle || `${draft.label} Report`,
      steps,
    };
    if (editId) {
      updateCustomEqType(editId, data);
      showToast("Equipment type updated", "success");
    } else {
      addCustomEqType(data);
      showToast("Equipment type created", "success");
    }
    setShowEditor(false);
  };

  const toggleStep = (key) => {
    const step = AVAILABLE_STEPS.find(s => s.key === key);
    if (step?.required) return;
    setSelectedSteps(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const updateField = (i, key, value) => {
    const fields = [...draft.assetFields];
    fields[i] = { ...fields[i], [key]: value };
    // Auto-generate key from label if key is empty or was auto-generated
    if (key === "label") {
      const autoKey = toKey(value);
      if (!fields[i].key || fields[i].key === toKey(fields[i]._prevLabel || "")) {
        fields[i].key = autoKey;
      }
      fields[i]._prevLabel = value;
    }
    setDraft({ ...draft, assetFields: fields });
  };

  const addField = () => {
    setDraft({ ...draft, assetFields: [...draft.assetFields, { id: uid(), key: "", label: "", type: "text", dropdownKey: "" }] });
  };

  const removeField = (id) => {
    setDraft({ ...draft, assetFields: draft.assetFields.filter(f => f.id !== id) });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Equipment Types</h2>
          <p style={{ fontSize: 13, color: t.textDim }}>Manage equipment types for reports. Built-in types cannot be edited.</p>
        </div>
        <button style={S.btnCyan} onClick={openNew}><Ic d={ICONS.plus} s={14} /> Create Type</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {allTypes.map(eq => (
          <div key={eq.id} style={S.card}>
            <div style={{ ...S.cH, display: "flex", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={S.cHT}>{eq.label}</span>
                <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: t.surfaceDeep, color: t.textDim }}>{eq.shortLabel}</span>
                {eq.isBuiltIn && <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: t.accentBg, color: t.accent }}>BUILT-IN</span>}
              </div>
              <span style={{ fontSize: 10, color: t.textFaint, fontFamily: "monospace" }}>{eq.reportCodePrefix}</span>
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ fontSize: 12, color: t.textDim, marginBottom: 8 }}>{eq.pdfTitle}</div>
              <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
                {eq.steps.map(s => (
                  <span key={s.key} style={{ fontSize: 10, padding: "2px 8px", background: t.surfaceDeep, borderRadius: 3, color: t.textMuted }}>{s.label}</span>
                ))}
              </div>
              {eq.assetFields && (
                <div style={{ fontSize: 11, color: t.textFaint, marginBottom: 8 }}>
                  {eq.assetFields.length} asset field{eq.assetFields.length !== 1 ? "s" : ""}
                </div>
              )}
              {!eq.isBuiltIn && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={S.btnSm} onClick={() => openEdit(eq)}><Ic d={ICONS.edit} s={12} /> Edit</button>
                  {confirmDeleteId === eq.id ? (
                    <>
                      <button style={{ ...S.btnSm, color: t.red }} onClick={() => { deleteCustomEqType(eq.id); setConfirmDeleteId(null); showToast("Equipment type deleted", "success"); }}>Confirm</button>
                      <button style={S.btnSm} onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                    </>
                  ) : (
                    <button style={{ ...S.btnSm, color: t.red }} onClick={() => setConfirmDeleteId(eq.id)}><Ic d={ICONS.trash} s={12} /> Delete</button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        <div style={{ ...S.card, border: `2px dashed ${t.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 160 }} onClick={openNew}>
          <div style={{ textAlign: "center" }}>
            <Ic d={ICONS.plus} s={24} c={t.accent} />
            <p style={{ fontSize: 13, fontWeight: 600, color: t.textSec, marginTop: 8 }}>Create Equipment Type</p>
            <p style={{ fontSize: 11, color: t.textDim }}>Define custom asset fields</p>
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      {showEditor && draft && (
        <div style={S.modal} onMouseDown={e => { if (e.target === e.currentTarget && !isDirty()) setShowEditor(false); }}>
          <div style={{ background: t.surface, borderRadius: 10, border: `1px solid ${t.border}`, width: "100%", maxWidth: 800, maxHeight: "85vh", overflow: "auto" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>{editId ? "Edit Equipment Type" : "Create Equipment Type"}</h3>
              <button style={S.btnIc} onClick={() => setShowEditor(false)} title="Close"><Ic d={ICONS.x} s={18} c={t.textMuted} /></button>
            </div>
            <div style={{ padding: 20 }}>
              {/* Metadata */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 1fr", gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={S.label}>Label <span style={{ color: t.red }}>*</span></label>
                  <input style={{ ...S.input, ...((!draft.label) ? { borderColor: t.red + "66" } : {}) }} value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} placeholder="e.g. Moisture Meter" />
                </div>
                <div>
                  <label style={S.label}>Short Label <span style={{ color: t.red }}>*</span></label>
                  <input style={{ ...S.input, ...((!draft.shortLabel) ? { borderColor: t.red + "66" } : {}) }} value={draft.shortLabel} maxLength={4} onChange={e => setDraft({ ...draft, shortLabel: e.target.value.toUpperCase() })} placeholder="e.g. MM" />
                </div>
                <div>
                  <label style={S.label}>Code Prefix <span style={{ color: t.red }}>*</span></label>
                  <input style={{ ...S.input, ...((!draft.reportCodePrefix) ? { borderColor: t.red + "66" } : {}) }} value={draft.reportCodePrefix} maxLength={4} onChange={e => setDraft({ ...draft, reportCodePrefix: e.target.value.toUpperCase() })} placeholder="e.g. MMR" />
                </div>
                <div>
                  <label style={S.label}>PDF Title</label>
                  <input style={S.input} value={draft.pdfTitle} onChange={e => setDraft({ ...draft, pdfTitle: e.target.value })} placeholder={draft.label ? `${draft.label} Report` : "e.g. Moisture Meter Report"} />
                </div>
              </div>

              {/* Wizard Steps */}
              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Wizard Steps</label>
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  {AVAILABLE_STEPS.map(s => {
                    const active = selectedSteps.includes(s.key);
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => toggleStep(s.key)}
                        style={{
                          fontSize: 11, padding: "5px 12px", borderRadius: 4, border: `1px solid ${active ? t.accent : t.border}`,
                          background: active ? t.accentBg : t.surfaceDeep, color: active ? t.accent : t.textFaint,
                          cursor: s.required ? "default" : "pointer", fontWeight: active ? 600 : 400,
                          display: "flex", alignItems: "center", gap: 5, opacity: s.required ? 1 : undefined,
                        }}
                      >
                        {s.required
                          ? <span style={{ fontSize: 10, color: t.accent }}>&#10003;</span>
                          : <span style={{ fontSize: 10, width: 12, textAlign: "center" }}>{active ? "✓" : ""}</span>}
                        {s.label}
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: 10, color: t.textFaint, marginTop: 4 }}>General is always required. Toggle others on/off as needed.</p>
              </div>

              {/* Asset Fields */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={S.label}>Asset Info Fields</span>
                <button style={S.btnCyan} onClick={addField}><Ic d={ICONS.plus} s={14} /> Add Field</button>
              </div>
              <div style={{ background: t.surfaceDeep, borderRadius: 6, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 100px 120px 40px", padding: "8px 12px", borderBottom: `1px solid ${t.border}` }}>
                  {["#", "Field Label", "Key", "Type", "Options Source", ""].map(h => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 600, color: t.textFaint, textTransform: "uppercase" }}>{h}</span>
                  ))}
                </div>
                {draft.assetFields.map((f, i) => (
                  <div key={f.id} style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 100px 120px 40px", padding: "4px 12px", borderBottom: `1px solid ${t.borderSub}`, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: t.textFaint, fontWeight: 500 }}>{i + 1}</span>
                    <input style={{ ...S.inputDk, marginRight: 8 }} value={f.label} onChange={e => updateField(i, "label", e.target.value)} placeholder="Field label..." />
                    <input style={{ ...S.inputDk, marginRight: 8, fontSize: 11, fontFamily: "monospace" }} value={f.key} onChange={e => updateField(i, "key", e.target.value)} placeholder="field_key" />
                    <select style={{ ...S.inputDk, fontSize: 11, padding: "3px 6px" }} value={f.type} onChange={e => updateField(i, "type", e.target.value)}>
                      <option value="text">Text</option>
                      <option value="dropdown">Dropdown</option>
                      <option value="condition">Condition</option>
                    </select>
                    {f.type === "dropdown" ? (
                      newDdKeyFor === i ? (
                        <div style={{ display: "flex", gap: 2 }}>
                          <input
                            style={{ ...S.inputDk, fontSize: 10, fontFamily: "monospace", flex: 1 }}
                            value={newDdKeyValue}
                            onChange={e => setNewDdKeyValue(toKey(e.target.value))}
                            placeholder="new_key"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === "Enter" && newDdKeyValue) { updateField(i, "dropdownKey", newDdKeyValue); setNewDdKeyFor(null); setNewDdKeyValue(""); }
                              if (e.key === "Escape") { setNewDdKeyFor(null); setNewDdKeyValue(""); }
                            }}
                          />
                          <button style={{ ...S.btnIc, padding: "2px" }} onClick={() => { if (newDdKeyValue) { updateField(i, "dropdownKey", newDdKeyValue); } setNewDdKeyFor(null); setNewDdKeyValue(""); }}>
                            <Ic d={ICONS.check} s={11} c={t.accent} />
                          </button>
                        </div>
                      ) : (
                        <select
                          style={{ ...S.inputDk, fontSize: 10, padding: "3px 4px" }}
                          value={f.dropdownKey || ""}
                          onChange={e => {
                            if (e.target.value === "__new__") { setNewDdKeyFor(i); setNewDdKeyValue(""); }
                            else updateField(i, "dropdownKey", e.target.value);
                          }}
                        >
                          <option value="">Select...</option>
                          {existingDdKeys.map(k => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                          <option value="__new__">+ Create new...</option>
                        </select>
                      )
                    ) : (
                      <span style={{ fontSize: 10, color: t.textFaint, paddingLeft: 6 }}>
                        {f.type === "condition" ? "uses conditions" : "—"}
                      </span>
                    )}
                    <button style={S.btnIc} onClick={() => removeField(f.id)}><Ic d={ICONS.trash} s={13} c={t.red} /></button>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 10, color: t.textFaint, marginTop: 6 }}>Dropdown fields link to option lists in Settings → Equipment Dropdowns.</p>
            </div>
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${t.border}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button style={S.btnOut} onClick={() => setShowEditor(false)}>Cancel</button>
              <button style={S.btnCyan} onClick={handleSave}><Ic d={ICONS.check} s={14} /> {editId ? "Save Changes" : "Create Type"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
