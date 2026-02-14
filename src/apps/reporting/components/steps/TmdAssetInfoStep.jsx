import { useReporting } from "../../context/ReportingContext";
import { useReportingSettings } from "../../context/ReportingSettingsContext";
import { useTheme } from "../../context/ReportingThemeContext";
import { F_, FS_ } from "../shared";

export const TmdAssetInfoStep = () => {
  const { ast, setAst } = useReporting();
  const { dd, condColors } = useReportingSettings();
  const S = useTheme();

  return (
    <div style={S.card}>
      <div style={S.cH}><span style={S.cHT}>Asset Information</span></div>
      <div style={{ padding: 16 }}>
        <div style={S.g2}>
          <FS_ label="Frame Type" value={ast.frameType || ""} onChange={v => setAst({ ...ast, frameType: v })} options={dd.tmdFrameTypes || []} allowEmpty />
          <FS_ label="Frame Condition" value={ast.frameCond || "Good"} onChange={v => setAst({ ...ast, frameCond: v })} options={dd.conditions} colorMap={condColors} />
          <FS_ label="Speed Input" value={ast.speedInput || ""} onChange={v => setAst({ ...ast, speedInput: v })} options={dd.tmdSpeedInputs || []} allowEmpty />
          <FS_ label="Controller" value={ast.controller || ""} onChange={v => setAst({ ...ast, controller: v })} options={dd.tmdControllers || []} allowEmpty />
        </div>
      </div>
    </div>
  );
};
