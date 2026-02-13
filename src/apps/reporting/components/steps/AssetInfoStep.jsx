import { useReporting } from "../../context/ReportingContext";
import { useReportingSettings } from "../../context/ReportingSettingsContext";
import { useTheme } from "../../context/ReportingThemeContext";
import { F_, FS_ } from "../shared";

export const AssetInfoStep = () => {
  const { ast, setAst } = useReporting();
  const { dd, condColors } = useReportingSettings();
  const S = useTheme();

  return (
    <>
      <div style={S.card}>
        <div style={S.cH}><span style={S.cHT}>Scale & Integrator</span></div>
        <div style={{ padding: 16 }}>
          <div style={S.g3}>
            <FS_ label="Scale Type" value={ast.scaleType} onChange={v => setAst({ ...ast, scaleType: v })} options={dd.scaleTypes} allowEmpty />
            <FS_ label="Scale Condition" value={ast.scaleCond} onChange={v => setAst({ ...ast, scaleCond: v })} options={dd.conditions} colorMap={condColors} />
            <FS_ label="Speed Input" value={ast.speedIn} onChange={v => setAst({ ...ast, speedIn: v })} options={dd.speedInputs} allowEmpty />
            <FS_ label="Integrator" value={ast.integrator} onChange={v => setAst({ ...ast, integrator: v })} options={dd.integratorTypes} allowEmpty />
            <F_ label="# Load Cells" value={ast.nlc} onChange={v => setAst({ ...ast, nlc: v })} type="number" />
            <F_ label="L/C Capacity" value={ast.lcCap} onChange={v => setAst({ ...ast, lcCap: v })} placeholder="e.g. 250kg" />
            <F_ label="L/C Specs (mV/V)" value={ast.lcSpecs} onChange={v => setAst({ ...ast, lcSpecs: v })} />
            <FS_ label="NMI Verified" value={ast.nmi} onChange={v => setAst({ ...ast, nmi: v })} options={["No", "Yes"]} />
            <F_ label="NMI Class" value={ast.nmiCls} onChange={v => setAst({ ...ast, nmiCls: v })} />
          </div>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.cH}><span style={S.cHT}>Billet Weight</span></div>
        <div style={{ padding: 16 }}>
          <div style={S.g3}>
            <FS_ label="Type" value={ast.billetType} onChange={v => setAst({ ...ast, billetType: v })} options={dd.billetWeightTypes} allowEmpty />
            <F_ label="# Weights" value={ast.nw} onChange={v => setAst({ ...ast, nw: v })} type="number" />
            <F_ label="Total (kg)" value={ast.bs} onChange={v => setAst({ ...ast, bs: v })} />
            <FS_ label="Condition" value={ast.billetCond} onChange={v => setAst({ ...ast, billetCond: v })} options={dd.conditions} colorMap={condColors} />
          </div>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.cH}><span style={S.cHT}>Roller Info</span></div>
        <div style={{ padding: 16 }}>
          <div style={S.g3}>
            <FS_ label="Condition" value={ast.rCond} onChange={v => setAst({ ...ast, rCond: v })} options={dd.conditions} colorMap={condColors} />
            <FS_ label="Type" value={ast.rType} onChange={v => setAst({ ...ast, rType: v })} options={dd.rollerTypes} allowEmpty />
            <F_ label="Recommended Change Date" value={ast.rDate} onChange={v => setAst({ ...ast, rDate: v })} type="date" />
          </div>
          <div style={{ marginTop: 12 }}>
            <F_ label="Roller Size" value={ast.rSize} onChange={v => setAst({ ...ast, rSize: v })} placeholder="e.g. 130 x 331 x 351 x 381 x 25 x 16 (18)" />
          </div>
        </div>
      </div>
    </>
  );
};
