import { StyleSheet, Font, View, Text, Image } from "@react-pdf/renderer";
import { fmtDate } from "../utils/reportUtils.js";
import CarlitoRegular from "../fonts/Carlito-Regular.ttf?url";
import CarlitoBold from "../fonts/Carlito-Bold.ttf?url";

Font.register({
  family: "Carlito",
  fonts: [
    { src: CarlitoRegular, fontWeight: 400 },
    { src: CarlitoBold, fontWeight: 700 },
  ],
});

export const s = StyleSheet.create({
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

// --- Shared components ---

export const Header = () => (
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

export const SecHdr = ({ text }) => (
  <View style={s.secHdr} minPresenceAhead={60}>
    <Text style={s.secHdrText}>{text.toUpperCase()}</Text>
  </View>
);

export const TRow = ({ label, value }) => (
  <View style={s.tRow}><Text style={s.tLabel}>{label}</Text><Text style={s.tValue}>{value || ""}</Text></View>
);

export const T4Row = ({ l1, v1, l2, v2, c1, c2 }) => (
  <View style={s.t4Row}>
    <Text style={s.t4Label}>{l1}</Text><Text style={{ ...s.t4Value, ...(c1 ? { color: c1, fontWeight: 700 } : {}) }}>{v1 || ""}</Text>
    <Text style={s.t4Label}>{l2}</Text><Text style={{ ...s.t4Value, ...(c2 ? { color: c2, fontWeight: 700 } : {}) }}>{v2 || ""}</Text>
  </View>
);

export const CalPair = ({ label, value }) => (
  <View style={s.calRow}><Text style={s.calLabel}>{label}</Text><Text style={s.calValue}>{value || ""}</Text></View>
);

// --- Shared sections ---

export const CustomerDetails = ({ cust }) => (
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
);

export const ServiceInfo = ({ svc, nsd }) => (
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
);

export const CommentsSection = ({ comments }) => (
  <View wrap={false} minPresenceAhead={60}>
    <SecHdr text="Comments & Recommendations" />
    <View style={s.commentsBox}><Text>{comments || "No comments recorded."}</Text></View>
  </View>
);

export const Footer = ({ reportCode }) => (
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
);

// Page number - separate fixed Text element (NOT inside a fixed View, to avoid render prop bug)
export const PageNumber = () => (
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
);
