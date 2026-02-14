import { Document, Page, View, Text } from "@react-pdf/renderer";
import { calcDiff, fmtDate } from "../utils/reportUtils.js";
import { generateReportCode } from "../utils/dataMapper.js";
import { s, Header, SecHdr, TRow, T4Row, CalPair, CustomerDetails, ServiceInfo, CommentsSection, Footer, PageNumber } from "./pdfShared.jsx";

export default function ReportPdfDocument({ cust, svc, cal, comments, ast, intD, selTpl, nsd, zD, sD, lD, spD, condColors = {} }) {
  const reportCode = generateReportCode(svc);
  const hasAnyPctIncluded = selTpl?.params.some(p => intD[p.id]?.incPct);

  return (
    <Document title={`Belt Weigher Report - ${reportCode}`} author="Accurate Industries">
      <Page size="A4" style={s.page} wrap>
        <Header />

        <Text style={s.title}>Belt Weigher Report</Text>
        <View style={s.infoBar}>
          <Text><Text style={s.bold}>Report:</Text> {reportCode}</Text>
          <Text><Text style={s.bold}>Date:</Text> {fmtDate(svc.date)}</Text>
        </View>

        <CustomerDetails cust={cust} />
        <ServiceInfo svc={svc} nsd={nsd} />

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

        <CommentsSection comments={comments} />

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

        <Footer reportCode={reportCode} />
        <PageNumber />
      </Page>
    </Document>
  );
}
