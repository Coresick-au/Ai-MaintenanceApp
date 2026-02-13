import { calcDiff, addMonths } from "./reportUtils";

/**
 * Maps the new reporting app's state to the Firestore report format
 * that AssetAnalytics.jsx expects for backward compatibility.
 */
export function mapToFirestoreFormat({ cust, svc, cal, comments, ast, intD, selTpl, nsd, zD, sD_, lD, spD }, downloadURL, fileName) {
  return {
    id: Date.now(),
    date: new Date().toISOString(),
    type: "Full Service",
    fileName: fileName,
    storageUrl: downloadURL || null,
    jobNumber: svc.jobNumber || svc.cv || "",
    data: {
      general: {
        reportId: generateReportCode(svc),
        customerName: cust.name,
        siteLocation: cust.location,
        contactName: cust.contact1,
        contactEmail: cust.email1,
        contactPhone1: cust.phone1 || "",
        contactName2: cust.contact2 || "",
        contactEmail2: cust.email2 || "",
        contactPhone2: cust.phone2 || "",
        assetName: svc.asset,
        conveyorNumber: svc.cv,
        serviceDate: svc.date,
        serviceType: svc.type,
        interval: svc.interval,
        nextServiceDate: nsd || addMonths(svc.date, svc.interval),
        technicians: (svc.techs || []).map(t => t.split(" - ")[0]).join(", "),
        techsFull: svc.techs || [],
        comments: comments,
      },
      calibration: {
        oldTare: cal.oz,
        newTare: cal.nz,
        tareChange: zD.pct,
        tareRepeatability: cal.zr,
        oldSpan: cal.os,
        newSpan: cal.ns,
        spanChange: sD_.pct,
        spanRepeatability: cal.sr,
        oldLength: cal.ol,
        newLength: cal.nl,
        lengthDiff: lD.diff,
        lengthChange: lD.pct,
        oldSpeed: cal.osp,
        newSpeed: cal.nsp,
        speedDiff: spD.diff,
        speedChange: spD.pct,
      },
      integrator: (selTpl?.params || []).map(p => {
        const af = intD[p.id]?.af || "";
        const al = intD[p.id]?.al || "";
        const d = calcDiff(af, al);
        return {
          id: p.id,
          label: `${p.name}${p.unit ? ` (${p.unit})` : ""}`,
          asFound: af,
          asLeft: al,
          diff: d.diff,
          percentChange: d.pct,
        };
      }),
      // New fields (safe to add - old code ignores them)
      assetInfo: { ...ast },
      templateName: selTpl?.name || "",
      appVersion: "v2",
    },
  };
}

/**
 * Reverse maps a Firestore report entry back to form state for "Copy Last Report".
 * Service date is intentionally left empty so the user sets a new date.
 */
export function mapFromFirestoreFormat(report) {
  const g = report.data?.general || {};
  const c = report.data?.calibration || {};
  const ai = report.data?.assetInfo || {};
  const intParams = report.data?.integrator || [];
  const templateName = report.data?.templateName || "";

  // Prefer full tech data, fall back to name-only parsing
  const techsFull = g.techsFull || (g.technicians || "").split(", ").filter(Boolean);

  return {
    cust: {
      name: g.customerName || "",
      location: g.siteLocation || "",
      contact1: g.contactName || "",
      email1: g.contactEmail || "",
      phone1: g.contactPhone1 || "",
      contact2: g.contactName2 || "",
      email2: g.contactEmail2 || "",
      phone2: g.contactPhone2 || "",
    },
    svc: {
      asset: g.assetName || "",
      cv: g.conveyorNumber || "",
      type: g.serviceType || "12 Weekly",
      interval: g.interval || "3",
      date: "", // intentionally blank — user sets new date
      techs: techsFull,
      jobNumber: "",
    },
    cal: {
      oz: c.oldTare || "",
      nz: c.newTare || "",
      os: c.oldSpan || "",
      ns: c.newSpan || "",
      zr: c.tareRepeatability || "",
      sr: c.spanRepeatability || "",
      ol: c.oldLength || "",
      nl: c.newLength || "",
      osp: c.oldSpeed || "",
      nsp: c.newSpeed || "",
    },
    comments: g.comments || "",
    ast: {
      scaleType: ai.scaleType || "",
      speedIn: ai.speedIn || "",
      scaleCond: ai.scaleCond || "Good",
      billetType: ai.billetType || "",
      integrator: ai.integrator || "",
      nw: ai.nw || "",
      nlc: ai.nlc || "",
      bs: ai.bs || "",
      lcCap: ai.lcCap || "",
      billetCond: ai.billetCond || "Good",
      lcSpecs: ai.lcSpecs || "",
      nmi: ai.nmi || "No",
      nmiCls: ai.nmiCls || "N/A",
      rCond: ai.rCond || "Good",
      rType: ai.rType || "",
      rDate: ai.rDate || "",
      rSize: ai.rSize || "",
    },
    intD: intParams.reduce((acc, p) => {
      acc[p.id] = { af: p.asFound || "", al: p.asLeft || "" };
      return acc;
    }, {}),
    templateName,
  };
}

/**
 * Generates the report code in the standard format: YYYY.MM.DD-CALR{jobNumber}-{CV}
 */
export function generateReportCode(svc) {
  const date = svc.date ? new Date(svc.date) : new Date();
  const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  const jobNum = svc.jobNumber || "00000";
  const cv = svc.cv || "CV00";
  return `${dateStr}-CALR${jobNum}-${cv}`;
}

/**
 * Generates the PDF filename in the standard format.
 */
export function generateFileName(svc) {
  return `${generateReportCode(svc)}.pdf`;
}
