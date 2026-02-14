import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { calcDiff, fmtDate } from "../utils/reportUtils.js";
import { generateReportCode } from "../utils/dataMapper.js";
import CarlitoRegular from "../fonts/Carlito-Regular.ttf?url";
import CarlitoBold from "../fonts/Carlito-Bold.ttf?url";

Font.register({
  family: "Carlito",
  fonts: [
    { src: CarlitoRegular, fontWeight: 400 },
    { src: CarlitoBold, fontWeight: 700 },
  ],
});

const s = StyleSheet.create({
  page: { fontFamily: "Carlito", fontSize: 10, lineHeight: 1.4, color: "#1a1a1a", backgroundColor: "#fff", paddingTop: 40, paddingBottom: 60, paddingHorizontal: 50 },
  hdr: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingBottom: 12, borderBottomWidth: 3, borderBottomColor: "#1a1816" },
  logo: { height: 50, objectFit: "contain" },
  hdrRight: { textAlign: "right", fontSize: 8, color: "#777", lineHeight: 1.6 },
  title: { textAlign: "center", fontSize: 18, fontWeight: 700, marginBottom: 12 },
  infoBar: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#f5f4f0", padding: "7 12", borderRadius: 4, marginBottom: 12, fontSize: 10 },
  bold: { fontWeight: 700 },
  secHdr: { backgroundColor: "#1a1816", padding: "5 10", marginTop: 10 },
  secHdrText: { color: "#fff", fontSize: 9, fontWeight: 700, letterSpacing: 0.6 },
  tRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eee" },
  tLabel: { padding: "3 10", color: "#888", fontSize: 10, fontWeight: 400, width: 100 },
  tValue: { padding: "3 10", fontSize: 10, fontWeight: 400, flex: 1 },
  t4Row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eee" },
  t4Label: { padding: "3 10", color: "#888", fontSize: 10, fontWeight: 400, width: 80 },
  t4Value: { padding: "3 10", fontSize: 10, fontWeight: 400, flex: 1 },
  calRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2, fontSize: 10 },
  calLabel: { color: "#666" },
  calValue: { fontWeight: 700, fontFamily: "Carlito", fontSize: 10 },
  grid2: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 10 },
  gridCol: { flex: 1, paddingRight: 10 },
  commentsBox: { padding: "10 12", fontSize: 10, lineHeight: 1.7, borderTopWidth: 1, borderBottomWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderTopColor: "#eee", borderBottomColor: "#eee", borderLeftColor: "#eee", borderRightColor: "#eee", minHeight: 50 },
  intHdrRow: { flexDirection: "row", backgroundColor: "#f5f4f0", borderBottomWidth: 1, borderBottomColor: "#ddd" },
  intHdrCell: { padding: "4 8", fontSize: 8, fontWeight: 700 },
  intRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  intCell: { padding: "3 8", fontSize: 9 },
  intCellMono: { padding: "3 8", fontSize: 9, fontFamily: "Carlito" },
});

// Header - only on page 1 (no fixed prop)
const Header = () => (
  <View style={s.hdr}>
    <Image src="/logos/ai-logo2.png" style={s.logo} />
    <View style={s.hdrRight}>
      <Text>ABN 99 657 158 524</Text>
      <Text>6/23 Ashtan Pl, Banyo QLD 4014</Text>
      <Text>admin@accurateindustries.com.au</Text>
      <Text>1300 101 666</Text>
    </View>
  </View>
);

// Section header - minPresenceAhead ensures it stays with content below
const SecHdr = ({ text }) => (
  <View style={s.secHdr} minPresenceAhead={60}>
    <Text style={s.secHdrText}>{text.toUpperCase()}</Text>
  </View>
);

const TRow = ({ label, value }) => (
  <View style={s.tRow}><Text style={s.tLabel}>{label}</Text><Text style={s.tValue}>{value || ""}</Text></View>
);

const T4Row = ({ l1, v1, l2, v2, c1, c2 }) => (
  <View style={s.t4Row}>
    <Text style={s.t4Label}>{l1}</Text><Text style={{ ...s.t4Value, ...(c1 ? { color: c1, fontWeight: 700 } : {}) }}>{v1 || ""}</Text>
    <Text style={s.t4Label}>{l2}</Text><Text style={{ ...s.t4Value, ...(c2 ? { color: c2, fontWeight: 700 } : {}) }}>{v2 || ""}</Text>
  </View>
);

const CalPair = ({ label, value }) => (
  <View style={s.calRow}><Text style={s.calLabel}>{label}</Text><Text style={s.calValue}>{value || ""}</Text></View>
);

export default function ReportPdfDocument({ cust, svc, cal, comments, ast, intD, selTpl, nsd, zD, sD, lD, spD, condColors = {} }) {
  const reportCode = generateReportCode(svc);
  const hasAnyPctIncluded = selTpl?.params.some(p => intD[p.id]?.incPct);

  return (
    <Document title={`Belt Weigher Report - ${reportCode}`} author="Accurate Industries">
      <Page size="A4" style={s.page} wrap>
        {/* Header - page 1 only */}
        <Header />

        <Text style={s.title}>Belt Weigher Report</Text>
        <View style={s.infoBar}>
          <Text><Text style={s.bold}>Report:</Text> {reportCode}</Text>
          <Text><Text style={s.bold}>Date:</Text> {fmtDate(svc.date)}</Text>
        </View>

        <View wrap={false}>
          <SecHdr text="Customer Details" />
          <TRow label="Customer:" value={cust.name} />
          <TRow label="Site:" value={cust.location} />
          <TRow label="Contact:" value={cust.contact1} />
          <TRow label="Email:" value={cust.email1} />
          <TRow label="Phone:" value={cust.phone1} />
          {cust.contact2 ? (
            <View>
              <TRow label="Contact 2:" value={cust.contact2} />
              <TRow label="Email:" value={cust.email2} />
              <TRow label="Phone:" value={cust.phone2} />
            </View>
          ) : null}
        </View>

        <View wrap={false}>
          <SecHdr text="Service Information" />
          <TRow label="Asset:" value={svc.asset} />
          <TRow label="Conveyor:" value={svc.cv} />
          <TRow label="Type:" value={svc.type} />
          <TRow label="Interval:" value={`${svc.interval} months`} />
          <TRow label="Next Service:" value={fmtDate(nsd)} />
          {(svc.techs || []).map((tech, i) => {
            const parts = tech ? tech.split(" - ") : [];
            const name = parts[0] || "";
            const phone = parts[1] || "";
            const email = parts[2] || "";
            return (
              <View key={i}>
                <TRow label={`Tech ${i + 1}:`} value={name} />
                {(phone || email) && (
                  <View style={s.tRow}>
                    <Text style={s.tLabel}></Text>
                    <Text style={{ ...s.tValue, fontSize: 9, color: "#888" }}>
                      {[phone, email].filter(Boolean).join("  |  ")}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View wrap={false}>
          <SecHdr text="Critical Calibration Errors" />
          <View style={s.grid2}>
            <View style={s.gridCol}>
              <CalPair label="Old Zero:" value={cal.oz} />
              <CalPair label="New Zero:" value={cal.nz} />
              <CalPair label="Change:" value={zD.pct !== "-" ? zD.pct + "%" : "-"} />
              <CalPair label="Repeat:" value={cal.zr ? cal.zr + "%" : "-"} />
            </View>
            <View style={s.gridCol}>
              <CalPair label="Old Span:" value={cal.os} />
              <CalPair label="New Span:" value={cal.ns} />
              <CalPair label="Change:" value={sD.pct !== "-" ? sD.pct + "%" : "-"} />
              <CalPair label="Repeat:" value={cal.sr ? cal.sr + "%" : "-"} />
            </View>
          </View>
          <View style={{ ...s.grid2, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 4 }}>
            <View style={s.gridCol}>
              <CalPair label="Old Length:" value={`${cal.ol} m`} />
              <CalPair label="New Length:" value={`${cal.nl} m`} />
              <CalPair label="Adjusted:" value={`${lD.diff} m`} />
              <CalPair label="% Change:" value={lD.pct !== "-" ? lD.pct + "%" : "-"} />
            </View>
            <View style={s.gridCol}>
              <CalPair label="Old Speed:" value={`${cal.osp} m/s`} />
              <CalPair label="New Speed:" value={`${cal.nsp} m/s`} />
              <CalPair label="Adjusted:" value={`${spD.diff} m/s`} />
              <CalPair label="% Change:" value={spD.pct !== "-" ? spD.pct + "%" : "-"} />
            </View>
          </View>
        </View>

        <View wrap={false} minPresenceAhead={60}>
          <SecHdr text="Comments & Recommendations" />
          <View style={s.commentsBox}><Text>{comments || "No comments recorded."}</Text></View>
        </View>

        <View wrap={false}>
          <SecHdr text="Asset Information" />
          <T4Row l1="Scale:" v1={ast.scaleType} l2="Speed In:" v2={ast.speedIn} />
          <T4Row l1="Condition:" v1={ast.scaleCond} c1={condColors[ast.scaleCond]} l2="Billet Type:" v2={ast.billetType} />
          <T4Row l1="Integrator:" v1={ast.integrator} l2="# Weights:" v2={ast.nw} />
          <T4Row l1="# LC:" v1={ast.nlc} l2="Billet:" v2={`${ast.bs} kg`} />
          <T4Row l1="LC Cap:" v1={ast.lcCap} l2="Billet Cond:" v2={ast.billetCond} c2={condColors[ast.billetCond]} />
          <T4Row l1="LC Specs:" v1={`${ast.lcSpecs} mV/V`} l2="" v2="" />
          <T4Row l1="NMI:" v1={ast.nmi} l2="Class:" v2={ast.nmiCls} />
        </View>

        <View wrap={false}>
          <SecHdr text="Roller Information" />
          <T4Row l1="Condition:" v1={ast.rCond} c1={condColors[ast.rCond]} l2="Type:" v2={ast.rType} />
          <TRow label="Rec. Change:" value={ast.rDate ? fmtDate(ast.rDate) : "-"} />
          <TRow label="Size:" value={ast.rSize} />
        </View>

        {/* Integrator Data table with optional % Change column */}
        <SecHdr text={`Integrator Data \u2014 ${selTpl?.name || ""}`} />
        <View style={s.intHdrRow} minPresenceAhead={30}>
          <Text style={{ ...s.intHdrCell, flex: 2 }}>PARAMETER</Text>
          <Text style={{ ...s.intHdrCell, flex: 1.5 }}>AS FOUND</Text>
          <Text style={{ ...s.intHdrCell, flex: 1.5 }}>AS LEFT</Text>
          <Text style={{ ...s.intHdrCell, flex: 1 }}>CHANGE</Text>
          {hasAnyPctIncluded && <Text style={{ ...s.intHdrCell, flex: 1 }}>% CHANGE</Text>}
        </View>
        {selTpl?.params.map((p) => {
          const af = intD[p.id]?.af || "-";
          const al = intD[p.id]?.al || "-";
          const d = calcDiff(af, al);
          const showPct = intD[p.id]?.incPct;
          return (
            <View key={p.id} style={s.intRow}>
              <Text style={{ ...s.intCell, flex: 2, color: "#666", fontWeight: 400 }}>{p.name}</Text>
              <Text style={{ ...s.intCellMono, flex: 1.5 }}>{af}{af !== "-" && p.unit ? ` ${p.unit}` : ""}</Text>
              <Text style={{ ...s.intCellMono, flex: 1.5 }}>{al}{al !== "-" && p.unit ? ` ${p.unit}` : ""}</Text>
              <Text style={{ ...s.intCellMono, flex: 1, color: "#888" }}>{d.diff !== "-" ? `${d.diff} ${p.unit}` : "-"}</Text>
              {hasAnyPctIncluded && (
                <Text style={{ ...s.intCellMono, flex: 1, color: showPct && d.pct !== "-" ? "#c05621" : "#ccc" }}>
                  {showPct && d.pct !== "-" ? d.pct + "%" : "-"}
                </Text>
              )}
            </View>
          );
        })}

        {/* Footer - static content in a fixed View */}
        <View
          fixed
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 40,
            paddingHorizontal: 50,
            paddingTop: 8,
          }}
        >
          <View style={{ borderTopWidth: 1, borderTopColor: "#ccc", paddingTop: 5 }}>
            <Text style={{ fontSize: 8, color: "#888" }}>{reportCode}</Text>
          </View>
        </View>

        {/* Page number - separate fixed Text element (NOT inside the fixed View, to avoid render prop bug) */}
        <Text
          fixed
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          style={{
            position: "absolute",
            bottom: 13,
            right: 50,
            fontSize: 8,
            color: "#888",
          }}
        />
      </Page>
    </Document>
  );
}
