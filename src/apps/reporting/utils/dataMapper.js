import { calcDiff, addMonths } from "./reportUtils";
import { getEquipmentType } from "../data/equipmentTypes";

/**
 * Maps the reporting app's state to the Firestore report format
 * that AssetAnalytics.jsx expects for backward compatibility.
 */
export function mapToFirestoreFormat({ cust, svc, cal, comments, ast, intD, selTpl, nsd, zD, sD_, lD, spD, eqType }, downloadURL, fileName) {
  const equipmentType = eqType || "belt_weigher";

  return {
    id: Date.now(),
    date: new Date().toISOString(),
    type: "Full Service",
    fileName: fileName,
    storageUrl: downloadURL || null,
    jobNumber: svc.jobNumber || svc.cv || "",
    data: {
      equipmentType,
      general: {
        reportId: generateReportCode(svc, equipmentType),
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
      // BW fixed calibration fields (only when applicable)
      ...(getEquipmentType(equipmentType).hasFixedCal ? {
        calibration: {
          oldTare: cal.oz,
          newTare: cal.nz,
          tareChange: zD?.pct,
          tareRepeatability: cal.zr,
          oldSpan: cal.os,
          newSpan: cal.ns,
          spanChange: sD_?.pct,
          spanRepeatability: cal.sr,
          oldLength: cal.ol,
          newLength: cal.nl,
          lengthDiff: lD?.diff,
          lengthChange: lD?.pct,
          oldSpeed: cal.osp,
          newSpeed: cal.nsp,
          speedDiff: spD?.diff,
          speedChange: spD?.pct,
        },
      } : {}),
      // Template-driven params (integrator data for BW, calibration data for TMD)
      integrator: (selTpl?.params || []).map(p => {
        if ((p.type || "cal") === "val") {
          return {
            id: p.id,
            label: p.name,
            type: "val",
            value: intD[p.id]?.val || "",
          };
        }
        const af = intD[p.id]?.af || "";
        const al = intD[p.id]?.al || "";
        const d = calcDiff(af, al);
        return {
          id: p.id,
          label: `${p.name}${p.unit ? ` (${p.unit})` : ""}`,
          type: "cal",
          asFound: af,
          asLeft: al,
          diff: d.diff,
          percentChange: d.pct,
        };
      }),
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
  const eqType = report.data?.equipmentType || "belt_weigher";
  const config = getEquipmentType(eqType);
  const g = report.data?.general || {};
  const c = report.data?.calibration || {};
  const ai = report.data?.assetInfo || {};
  const intParams = report.data?.integrator || [];
  const templateName = report.data?.templateName || "";

  // Prefer full tech data, fall back to name-only parsing
  const techsFull = g.techsFull || (g.technicians || "").split(", ").filter(Boolean);

  // BW fixed calibration fields
  const calData = config.hasFixedCal ? {
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
  } : config.defaultCal;

  return {
    equipmentType: eqType,
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
    cal: calData,
    comments: g.comments || "",
    ast: Object.keys(ai).length > 0 ? { ...ai } : config.defaultAst,
    intD: intParams.reduce((acc, p) => {
      if (p.type === "val") {
        acc[p.id] = { val: p.value || "" };
      } else {
        acc[p.id] = { af: p.asFound || "", al: p.asLeft || "" };
      }
      return acc;
    }, {}),
    templateName,
  };
}

/**
 * Generates the report code in the format: YYYY.MM.DD-{PREFIX}{jobNumber}-{CV}
 */
export function generateReportCode(svc, eqType) {
  const config = getEquipmentType(eqType || "belt_weigher");
  const date = svc.date ? new Date(svc.date) : new Date();
  const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  const jobNum = svc.jobNumber || "00000";
  const cv = svc.cv || "CV00";
  return `${dateStr}-${config.reportCodePrefix}${jobNum}-${cv}`;
}

/**
 * Generates the PDF filename in the standard format.
 */
export function generateFileName(svc, eqType) {
  return `${generateReportCode(svc, eqType)}.pdf`;
}
