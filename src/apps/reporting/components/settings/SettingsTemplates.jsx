import { useReporting } from "../../context/ReportingContext";
import { useReportingSettings } from "../../context/ReportingSettingsContext";
import { useTheme } from "../../context/ReportingThemeContext";
import { Ic, ICONS } from "../shared";
import { uid } from "../../utils/reportUtils";

export const SettingsTemplates = () => {
  const { selTpl, setShowTplEd, setEditTplId, setTplDraft } = useReporting();
  const { tpls, setTpls, duplicateTemplate } = useReportingSettings();
  const S = useTheme();
  const t = S.t;

  const openNewTpl = () => {
    setTplDraft({ name: "", desc: "", params: [{ id: uid(), name: "Scale Capacity", unit: "t/h" }] });
    setEditTplId(null);
    setShowTplEd(true);
  };

  const openEditTpl = (tp) => {
    setTplDraft({ name: tp.name, desc: tp.desc, params: tp.params.map(p => ({ ...p })) });
    setEditTplId(tp.id);
    setShowTplEd(true);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Report Templates</h2>
          <p style={{ fontSize: 13, color: t.textDim }}>Create and manage integrator templates.</p>
        </div>
        <button style={S.btnCyan} onClick={openNewTpl}><Ic d={ICONS.plus} s={14} /> Create Template</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {tpls.map(tp => (
          <div key={tp.id} style={{ ...S.card, border: selTpl?.id === tp.id ? `1px solid ${t.accent}` : `1px solid ${t.border}` }}>
            <div style={{ ...S.cH, display: "flex", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Ic d={ICONS.file} s={14} c={t.accent} />
                <span style={S.cHT}>{tp.name}</span>
                {tp.isDefault && <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: t.accentBg, color: t.accent }}>DEFAULT</span>}
              </div>
              <span style={{ fontSize: 11, color: t.textDim }}>{tp.params.length} params</span>
            </div>
            <div style={{ padding: 12 }}>
              <p style={{ fontSize: 12, color: t.textDim, marginBottom: 12 }}>{tp.desc || "No description"}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                {tp.params.slice(0, 6).map(p => (
                  <span key={p.id} style={{ fontSize: 10, padding: "2px 8px", background: t.surfaceDeep, borderRadius: 3, color: t.textMuted }}>
                    {p.name} {p.unit && <span style={{ color: t.accent }}>({p.unit})</span>}
                  </span>
                ))}
                {tp.params.length > 6 && <span style={{ fontSize: 10, padding: "2px 8px", color: t.textFaint }}>+{tp.params.length - 6} more</span>}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={S.btnSm} onClick={() => openEditTpl(tp)}><Ic d={ICONS.edit} s={12} /> Edit</button>
                <button style={S.btnSm} onClick={() => duplicateTemplate(tp)}><Ic d={ICONS.copy} s={12} /> Duplicate</button>
                {!tp.isDefault && <button style={{ ...S.btnSm, color: t.red }} onClick={() => setTpls(tpls.filter(x => x.id !== tp.id))}><Ic d={ICONS.trash} s={12} /> Delete</button>}
              </div>
            </div>
          </div>
        ))}
        <div style={{ ...S.card, border: `2px dashed ${t.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 160 }} onClick={openNewTpl}>
          <div style={{ textAlign: "center" }}>
            <Ic d={ICONS.plus} s={24} c={t.accent} />
            <p style={{ fontSize: 13, fontWeight: 600, color: t.textSec, marginTop: 8 }}>Create New Template</p>
            <p style={{ fontSize: 11, color: t.textDim }}>Define custom parameters</p>
          </div>
        </div>
      </div>
    </div>
  );
};
