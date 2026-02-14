import { useReporting } from "../../context/ReportingContext";
import { useReportingSettings } from "../../context/ReportingSettingsContext";
import { useTheme } from "../../context/ReportingThemeContext";
import { Ic, ICONS, SuggestInput } from "../shared";
import { uid } from "../../utils/reportUtils";
import { getAllEquipmentTypes, getEquipmentType } from "../../data/equipmentTypes";

export const TemplateEditorModal = () => {
  const { showTplEd, setShowTplEd, editTplId, tplDraft, setTplDraft } = useReporting();
  const { tpls, setTpls, units, setUnits } = useReportingSettings();
  const S = useTheme();
  const t = S.t;

  if (!showTplEd) return null;

  const saveTpl = () => {
    if (!tplDraft.name) return;
    const data = { ...tplDraft, equipmentType: tplDraft.equipmentType || "belt_weigher" };
    if (editTplId) setTpls(tpls.map(x => x.id === editTplId ? { ...x, ...data } : x));
    else setTpls([...tpls, { ...data, id: "tpl_" + uid(), isDefault: false }]);
    setShowTplEd(false);
  };

  return (
    <div style={S.modal} onMouseDown={e => { if (e.target === e.currentTarget) setShowTplEd(false); }}>
      <div style={{ background: t.surface, borderRadius: 10, border: `1px solid ${t.border}`, width: "100%", maxWidth: 800, maxHeight: "85vh", overflow: "auto" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>{editTplId ? "Edit Template" : "Create New Template"}</h3>
          <button style={S.btnIc} onClick={() => setShowTplEd(false)}><Ic d={ICONS.x} s={18} c={t.textMuted} /></button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div><label style={S.label}>Template Name</label><input style={S.input} value={tplDraft.name} onChange={e => setTplDraft({ ...tplDraft, name: e.target.value })} placeholder="e.g. Microtech 3101" /></div>
            <div><label style={S.label}>Description</label><input style={S.input} value={tplDraft.desc} onChange={e => setTplDraft({ ...tplDraft, desc: e.target.value })} placeholder="Brief description..." /></div>
            <div>
              <label style={S.label}>Equipment Type</label>
              <select style={S.input} value={tplDraft.equipmentType || "belt_weigher"} onChange={e => setTplDraft({ ...tplDraft, equipmentType: e.target.value })}>
                {getAllEquipmentTypes().map(et => <option key={et.id} value={et.id}>{et.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={S.label}>Parameters</span>
            <button style={S.btnCyan} onClick={() => setTplDraft({ ...tplDraft, params: [...tplDraft.params, { id: uid(), name: "", unit: "" }] })}>
              <Ic d={ICONS.plus} s={14} /> Add Parameter
            </button>
          </div>
          <div style={{ background: t.surfaceDeep, borderRadius: 6, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 140px 100px 40px", padding: "8px 12px", borderBottom: `1px solid ${t.border}` }}>
              {["#", "Parameter Name", "Unit", "Type", ""].map(h => <span key={h} style={{ fontSize: 10, fontWeight: 600, color: t.textFaint, textTransform: "uppercase" }}>{h}</span>)}
            </div>
            {tplDraft.params.map((p, i) => (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "40px 1fr 140px 100px 40px", padding: "4px 12px", borderBottom: `1px solid ${t.borderSub}`, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: t.textFaint, fontWeight: 500 }}>{i + 1}</span>
                <input style={{ ...S.inputDk, marginRight: 8 }} value={p.name} onChange={e => {
                  const ps = [...tplDraft.params]; ps[i] = { ...ps[i], name: e.target.value }; setTplDraft({ ...tplDraft, params: ps });
                }} placeholder="Parameter name..." />
                <SuggestInput style={S.inputDk} options={units} value={p.unit} placeholder="(none)" onChange={v => {
                  const ps = [...tplDraft.params]; ps[i] = { ...ps[i], unit: v }; setTplDraft({ ...tplDraft, params: ps });
                }} onBlur={() => { const v = (p.unit || "").trim(); if (v && !units.includes(v)) setUnits([...units, v]); }} />
                <select style={{ ...S.inputDk, fontSize: 11, padding: "3px 6px" }} value={p.type || "cal"} onChange={e => {
                  const ps = [...tplDraft.params]; ps[i] = { ...ps[i], type: e.target.value }; setTplDraft({ ...tplDraft, params: ps });
                }}>
                  <option value="cal">AF/AL</option>
                  <option value="val">Value</option>
                </select>
                <button style={S.btnIc} onClick={() => setTplDraft({ ...tplDraft, params: tplDraft.params.filter(x => x.id !== p.id) })}>
                  <Ic d={ICONS.trash} s={13} c={t.red} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${t.border}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={S.btnOut} onClick={() => setShowTplEd(false)}>Cancel</button>
          <button style={S.btnCyan} onClick={saveTpl}><Ic d={ICONS.check} s={14} /> {editTplId ? "Save Changes" : "Create Template"}</button>
        </div>
      </div>
    </div>
  );
};
