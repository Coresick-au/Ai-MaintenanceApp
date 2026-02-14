import { Document, Page, View, Text } from "@react-pdf/renderer";
import { calcDiff, fmtDate } from "../utils/reportUtils.js";
import { generateReportCode } from "../utils/dataMapper.js";
import { s, Header, SecHdr, T4Row, CalPair, CustomerDetails, ServiceInfo, CommentsSection, Footer, PageNumber } from "./pdfShared.jsx";

export default function TmdPdfDocument({ cust, svc, comments, ast, intD, selTpl, nsd, eqType, condColors = {} }) {
  const reportCode = generateReportCode(svc, eqType || "tmd");
  const calParams = (selTpl?.params || []).filter(p => (p.type || "cal") === "cal");
  const valParams = (selTpl?.params || []).filter(p => p.type === "val");

  return (
    <Document title={`TMD Report - ${reportCode}`} author="Accurate Industries">
      <Page size="A4" style={s.page} wrap>
        <Header />

        <Text style={s.title}>Tramp Metal Detector Report</Text>
        <View style={s.infoBar}>
          <Text><Text style={s.bold}>Report:</Text> {reportCode}</Text>
          <Text><Text style={s.bold}>Date:</Text> {fmtDate(svc.date)}</Text>
        </View>

        <CustomerDetails cust={cust} />
        <ServiceInfo svc={svc} nsd={nsd} />

        {/* Critical Calibration Errors */}
        <View wrap={false}>
          <SecHdr text="Critical Calibration Errors" />
          {/* Cal params: paired in 2-column grid with As Found / As Left / Change */}
          {calParams.length > 0 && (
            <View style={s.grid2}>
              {calParams.map(p => {
                const af = intD[p.id]?.af || "-";
                const al = intD[p.id]?.al || "-";
                const d = calcDiff(af, al);
                return (
                  <View key={p.id} style={s.gridCol}>
                    <CalPair label={`${p.name} As Found:`} value={af} />
                    <CalPair label={`${p.name} As Left:`} value={al} />
                    <CalPair label={`${p.name} Change:`} value={d.diff !== "-" ? d.diff : "0.00"} />
                  </View>
                );
              })}
            </View>
          )}
          {/* Val params: paired rows (2 per row) */}
          {valParams.length > 0 && (
            <View>
              {Array.from({ length: Math.ceil(valParams.length / 2) }).map((_, i) => {
                const p1 = valParams[i * 2];
                const p2 = valParams[i * 2 + 1];
                return (
                  <T4Row
                    key={i}
                    l1={p1.name + ":"}
                    v1={intD[p1.id]?.val || "-"}
                    l2={p2 ? p2.name + ":" : ""}
                    v2={p2 ? (intD[p2.id]?.val || "-") : ""}
                  />
                );
              })}
            </View>
          )}
        </View>

        {/* Asset Information */}
        <View wrap={false}>
          <SecHdr text="Asset Information" />
          <T4Row l1="Frame Type:" v1={ast.frameType || "-"} l2="Speed Input:" v2={ast.speedInput || "-"} />
          <T4Row l1="Frame Condition:" v1={ast.frameCond || "-"} c1={condColors[ast.frameCond]} l2="Controller:" v2={ast.controller || "-"} />
        </View>

        <CommentsSection comments={comments} />
        <Footer reportCode={reportCode} />
        <PageNumber />
      </Page>
    </Document>
  );
}
