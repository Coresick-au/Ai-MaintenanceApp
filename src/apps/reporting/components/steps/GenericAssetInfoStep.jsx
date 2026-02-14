import { useReporting } from "../../context/ReportingContext";
import { useReportingSettings } from "../../context/ReportingSettingsContext";
import { useTheme } from "../../context/ReportingThemeContext";
import { F_, FS_ } from "../shared";
import { getEquipmentType } from "../../data/equipmentTypes";

export const GenericAssetInfoStep = () => {
  const { ast, setAst, eqType } = useReporting();
  const { dd, condColors } = useReportingSettings();
  const S = useTheme();
  const t = S.t;

  const config = getEquipmentType(eqType);
  const fields = config.assetFields || [];

  if (fields.length === 0) {
    return (
      <div style={S.card}>
        <div style={S.cH}><span style={S.cHT}>Asset Information</span></div>
        <div style={{ padding: 20, textAlign: "center", color: t.textFaint, fontSize: 13 }}>
          No asset fields defined for this equipment type. Edit the type in Settings to add fields.
        </div>
      </div>
    );
  }

  return (
    <div style={S.card}>
      <div style={S.cH}><span style={S.cHT}>Asset Information</span></div>
      <div style={{ padding: 16 }}>
        <div style={S.g2}>
          {fields.map(f => {
            if (f.type === "dropdown") {
              return (
                <FS_
                  key={f.id}
                  label={f.label}
                  value={ast[f.key] || ""}
                  onChange={v => setAst({ ...ast, [f.key]: v })}
                  options={dd[f.dropdownKey] || []}
                  allowEmpty
                />
              );
            }
            if (f.type === "condition") {
              return (
                <FS_
                  key={f.id}
                  label={f.label}
                  value={ast[f.key] || "Good"}
                  onChange={v => setAst({ ...ast, [f.key]: v })}
                  options={dd.conditions || []}
                  colorMap={condColors}
                />
              );
            }
            return (
              <F_
                key={f.id}
                label={f.label}
                value={ast[f.key] || ""}
                onChange={v => setAst({ ...ast, [f.key]: v })}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
