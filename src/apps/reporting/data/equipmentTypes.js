export const EQUIPMENT_TYPES = {
  belt_weigher: {
    id: "belt_weigher",
    label: "Belt Weigher",
    shortLabel: "BW",
    pdfTitle: "Belt Weigher Report",
    reportCodePrefix: "CALR",
    isBuiltIn: true,
    steps: [
      { key: "general", label: "General" },
      { key: "calibration", label: "Calibration" },
      { key: "comments", label: "Comments" },
      { key: "assetInfo", label: "Asset Info" },
      { key: "intData", label: "Integrator Data" },
    ],
    defaultAst: {
      scaleType: "", speedIn: "", scaleCond: "Good", billetType: "",
      integrator: "", nw: "", nlc: "", bs: "", lcCap: "",
      billetCond: "Good", lcSpecs: "", nmi: "No", nmiCls: "N/A",
      rCond: "Good", rType: "", rDate: "", rSize: "",
    },
    defaultCal: { oz: "", nz: "", os: "", ns: "", zr: "", sr: "", ol: "", nl: "", osp: "", nsp: "" },
    hasFixedCal: true,
  },
  tmd: {
    id: "tmd",
    label: "Tramp Metal Detector",
    shortLabel: "TMD",
    pdfTitle: "Tramp Metal Detector Report",
    reportCodePrefix: "TMDR",
    isBuiltIn: true,
    steps: [
      { key: "general", label: "General" },
      { key: "tmdData", label: "TMD Data" },
      { key: "comments", label: "Comments" },
      { key: "assetInfo", label: "Asset Info" },
    ],
    defaultAst: { frameType: "", frameCond: "Good", speedInput: "", controller: "" },
    defaultCal: {},
    hasFixedCal: false,
  },
};

// Runtime registry for custom equipment types (loaded from Firestore)
let _customTypes = {};

export function registerCustomTypes(types) {
  _customTypes = {};
  (types || []).forEach(t => {
    // Compute defaultAst from assetFields if not already set
    if (t.assetFields && !t.defaultAst) {
      const ast = {};
      t.assetFields.forEach(f => { ast[f.key] = f.type === "condition" ? "Good" : ""; });
      t.defaultAst = ast;
    }
    _customTypes[t.id] = t;
  });
}

export const EQUIPMENT_TYPE_LIST = Object.values(EQUIPMENT_TYPES);
export const DEFAULT_EQUIPMENT_TYPE = "belt_weigher";

export function getEquipmentType(id) {
  return _customTypes[id] || EQUIPMENT_TYPES[id] || EQUIPMENT_TYPES.belt_weigher;
}

export function getAllEquipmentTypes() {
  return [...Object.values(EQUIPMENT_TYPES), ...Object.values(_customTypes)];
}
