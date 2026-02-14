import { BlobProvider } from "@react-pdf/renderer";
import { useReporting } from "../context/ReportingContext";
import { useReportingSettings } from "../context/ReportingSettingsContext";
import { useTheme } from "../context/ReportingThemeContext";
import { Ic, ICONS } from "./shared";
import ReportPdfDocument from "../pdf/ReportPdfDocument";
import { generateReportCode } from "../utils/dataMapper";

export const PrintPreview = () => {
  const { cust, svc, cal, comments, ast, intD, selTpl, nsd, zD, sD_, lD, spD, showPrint, setShowPrint } = useReporting();
  const { condColors } = useReportingSettings();
  const S = useTheme();
  const t = S.t;

  if (!showPrint) return null;

  const pdfDoc = (
    <ReportPdfDocument
      cust={cust} svc={svc} cal={cal} comments={comments} ast={ast}
      intD={intD} selTpl={selTpl} nsd={nsd}
      zD={zD} sD={sD_} lD={lD} spD={spD} condColors={condColors}
    />
  );

  const handleDownload = (url) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${generateReportCode(svc)}.pdf`;
    a.click();
  };

  const handlePrint = (url) => {
    const w = window.open(url);
    if (w) w.onload = () => w.print();
  };

  return (
    <div style={S.printOv} onMouseDown={e => { if (e.target === e.currentTarget) setShowPrint(false); }}>
      <BlobProvider document={pdfDoc}>
        {({ url, loading, error }) => (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 820, maxWidth: "100%" }}>
            <div style={{ position: "sticky", top: 0, zIndex: 1001, background: t.surfaceAlt, padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "8px 8px 0 0", width: "100%", border: `1px solid ${t.border}`, borderBottom: "none" }}>
              <span style={{ fontWeight: 500 }}>Print Preview</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {loading && <span style={{ fontSize: 12, color: t.textMuted }}>Generating...</span>}
                {error && <span style={{ fontSize: 12, color: t.red }}>Error generating PDF</span>}
                {url && (
                  <>
                    <button style={S.btnCyan} onClick={() => handleDownload(url)}><Ic d={ICONS.file} s={14} /> Download</button>
                    <button style={S.btnCyan} onClick={() => handlePrint(url)}><Ic d={ICONS.printer} s={14} /> Print</button>
                  </>
                )}
                <button style={S.btnOut} onClick={() => setShowPrint(false)}>Close</button>
              </div>
            </div>
            {loading
              ? <div style={{ height: 600, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", width: "100%", borderRadius: "0 0 8px 8px" }}><span style={{ color: t.textMuted }}>Generating PDF...</span></div>
              : url
                ? <iframe src={url} style={{ width: "100%", height: "calc(100vh - 100px)", border: "none", borderRadius: "0 0 8px 8px" }} title="PDF Preview" />
                : null
            }
          </div>
        )}
      </BlobProvider>
    </div>
  );
};
