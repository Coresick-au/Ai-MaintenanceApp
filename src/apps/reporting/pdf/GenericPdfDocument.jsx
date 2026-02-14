import { Document, Page, View, Text } from "@react-pdf/renderer";
import { calcDiff, fmtDate } from "../utils/reportUtils.js";
import { generateReportCode } from "../utils/dataMapper.js";
import { getEquipmentType } from "../data/equipmentTypes.js";
import { s, Header, SecHdr, T4Row, CalPair, CustomerDetails, ServiceInfo, CommentsSection, Footer, PageNumber } from "./pdfShared.jsx";

export default function GenericPdfDocument({ cust, svc, comments, ast, intD, selTpl, nsd, eqType, condColors = {} }) {
  const config = getEquipmentType(eqType);
  const reportCode = generateReportCode(svc, eqType);
  const calParams = (selTpl?.params || []).filter(p => (p.type || "cal") === "cal");
  const valParams = (selTpl?.params || []).filter(p => p.type === "val");
  const assetFields = config.assetFields || [];

  return (
    <Document title={`${config.pdfTitle} - ${reportCode}`} author="Accurate Industries">
      <Page size="A4" style={s.page} wrap>
        <Header />

        <Text style={s.title}>{config.pdfTitle}</Text>
        <View style={s.infoBar}>
          <Text><Text style={s.bold}>Report:</Text> {reportCode}</Text>
          <Text><Text style={s.bold}>Date:</Text> {fmtDate(svc.date)}</Text>
        </View>

        <CustomerDetails cust={cust} />
        <ServiceInfo svc={svc} nsd={nsd} />

        {/* Template Data Section */}
        {(calParams.length > 0 || valParams.length > 0) && (
          <View wrap={false}>
            <SecHdr text={selTpl?.name || "Calibration Data"} />
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
            {valParams.length > 0 && (
              <View>
                {Array.from({ length: Math.ceil(valParams.length / 2) }).map((_, i) => {
                  const p1 = valParams[i * 2];
                  const p2 = valParams[i * 2 + 1];
                  return (
                    <T4Row
                      key={i}
                      l1={p1.name + ":"} v1={intD[p1.id]?.val || "-"}
                      l2={p2 ? p2.name + ":" : ""} v2={p2 ? (intD[p2.id]?.val || "-") : ""}
                    />
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Dynamic Asset Information */}
        {assetFields.length > 0 && (
          <View wrap={false}>
            <SecHdr text="Asset Information" />
            {Array.from({ length: Math.ceil(assetFields.length / 2) }).map((_, i) => {
              const f1 = assetFields[i * 2];
              const f2 = assetFields[i * 2 + 1];
              const v1 = ast[f1.key] || "-";
              const v2 = f2 ? (ast[f2.key] || "-") : "";
              const c1 = f1.type === "condition" ? condColors[v1] : undefined;
              const c2 = f2?.type === "condition" ? condColors[v2] : undefined;
              return (
                <T4Row
                  key={i}
                  l1={f1.label + ":"} v1={v1} c1={c1}
                  l2={f2 ? f2.label + ":" : ""} v2={v2} c2={c2}
                />
              );
            })}
          </View>
        )}

        <CommentsSection comments={comments} />
        <Footer reportCode={reportCode} />
        <PageNumber />
      </Page>
    </Document>
  );
}
