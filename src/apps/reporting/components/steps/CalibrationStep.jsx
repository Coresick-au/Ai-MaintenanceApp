import { useReporting } from "../../context/ReportingContext";
import { useTheme } from "../../context/ReportingThemeContext";
import { F_, FC_, SL_ } from "../shared";

export const CalibrationStep = () => {
  const { cal, setCal, zD, sD_, lD, spD } = useReporting();
  const S = useTheme();
  const t = S.t;

  return (
    <div style={S.card}>
      <div style={S.cH}><span style={S.cHT}>Critical Calibration Errors</span></div>
      <div style={{ padding: 16 }}>
        <div style={S.g2}>
          <div>
            <SL_ text="Zero / Tare" />
            <div style={S.fs}>
              <F_ label="Old Zero/Tare" value={cal.oz} onChange={v => setCal({ ...cal, oz: v })} />
              <F_ label="New Zero/Tare" value={cal.nz} onChange={v => setCal({ ...cal, nz: v })} />
              <FC_ label="Change (%)" value={zD.pct !== "-" ? zD.pct + " %" : "-"} change={zD.pct} />
              <F_ label="Repeatability (%)" value={cal.zr} onChange={v => setCal({ ...cal, zr: v })} />
            </div>
          </div>
          <div>
            <SL_ text="Span" />
            <div style={S.fs}>
              <F_ label="Old Span" value={cal.os} onChange={v => setCal({ ...cal, os: v })} />
              <F_ label="New Span" value={cal.ns} onChange={v => setCal({ ...cal, ns: v })} />
              <FC_ label="Change (%)" value={sD_.pct !== "-" ? sD_.pct + " %" : "-"} change={sD_.pct} />
              <F_ label="Repeatability (%)" value={cal.sr} onChange={v => setCal({ ...cal, sr: v })} />
            </div>
          </div>
        </div>
        <div style={{ height: 1, background: t.border, margin: "20px 0" }} />
        <div style={S.g2}>
          <div>
            <SL_ text="Belt Length" />
            <div style={S.fs}>
              <F_ label="Old (m)" value={cal.ol} onChange={v => setCal({ ...cal, ol: v })} />
              <F_ label="New (m)" value={cal.nl} onChange={v => setCal({ ...cal, nl: v })} />
              <FC_ label="Adjusted (m)" value={lD.diff + " m"} change={lD.diff} />
              <FC_ label="% Change" value={lD.pct !== "-" ? lD.pct + " %" : "-"} change={lD.pct} />
            </div>
          </div>
          <div>
            <SL_ text="Belt Speed" />
            <div style={S.fs}>
              <F_ label="Old (m/s)" value={cal.osp} onChange={v => setCal({ ...cal, osp: v })} />
              <F_ label="New (m/s)" value={cal.nsp} onChange={v => setCal({ ...cal, nsp: v })} />
              <FC_ label="Adjusted (m/s)" value={spD.diff + " m/s"} change={spD.diff} />
              <FC_ label="% Change" value={spD.pct !== "-" ? spD.pct + " %" : "-"} change={spD.pct} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
