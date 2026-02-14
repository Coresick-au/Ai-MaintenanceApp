export const TECHS = [
  "Brad Leeming - 0475 666 661 - brad.leeming@accurateindustries.com.au",
  "Peter Leeming - 0475 666 660 - peter.leeming@accurateindustries.com.au",
  "Matthew Keane - 0475 666 662 - matthew.keane@accurateindustries.com.au",
  "Adam Forrest - 0475 666 668 - adam.forrest@accurateindustries.com.au",
  "Peter Gensch - 0475 660 000 - peter.gensch@accurateindustries.com.au",
  "Jordan Wardrope - 0475 666 664 - jordan.wardrope@accurateindustries.com.au",
  "Caleb Bateman - 0475 666 667 - caleb.bateman@accurateindustries.com.au",
];

export const INIT_DD = {
  serviceTypes: ["12 Weekly", "6 Monthly", "Annual", "Commissioning", "Breakdown", "Other"],
  scaleTypes: ["CST PCS 2-2", "CST PCS2-2", "SRO BA44", "SRO BA 44 ss"],
  integratorTypes: ["Microtech 9101", "Microtech 3101", "Schenck Tersus"],
  speedInputs: ["SRO Spiral Cage", "AI Spiral Cage", "Encoder"],
  billetWeightTypes: ["Store in Place", "SIP", "Hang On"],
  rollerTypes: ["HDPE - Cams", "HDPE - Screws", "Steel - Cams", "Steel - Screws"],
  conditions: ["Good", "Fair", "Poor", "N/A"],
  // TMD dropdowns
  tmdFrameTypes: ["Thermo", "Standard", "Heavy Duty"],
  tmdControllers: ["Oretronic 6", "Eriez", "Bunting"],
  tmdSpeedInputs: ["Fixed", "Variable", "Encoder"],
};

export const INIT_COMMENTS = [
  { id: "c1", cat: "Cleaning", text: "Scale was found clean and required little cleaning.", on: true },
  { id: "c2", cat: "Cleaning", text: "Small amount of coal build up cleaned prior to testing.", on: true },
  { id: "c3", cat: "Cleaning", text: "Significant material build up found on weigher frame and cleaned prior to calibration.", on: true },
  { id: "c4", cat: "Cleaning", text: "Return rollers in weigh area had significant build up \u2014 cleaned.", on: true },
  { id: "c5", cat: "Calibration", text: "Zero and span calibrations were performed and weighing performance was repeatable.", on: true },
  { id: "c6", cat: "Calibration", text: "Span calibrations weren't able to be performed due to [REASON].", on: true },
  { id: "c7", cat: "Calibration", text: "3 monthly inspections and calibration completed.", on: true },
  { id: "c8", cat: "Adjustments", text: "Speed and length adjusted as a new belt was installed last shutdown.", on: true },
  { id: "c9", cat: "Adjustments", text: "Adjusted speed and length prior to calibrations.", on: true },
  { id: "c10", cat: "Adjustments", text: "Length and speed have not been adjusted as integrator settings are very close to actual readings.", on: true },
  { id: "c11", cat: "Adjustments", text: "Integrator speed didn't match actual speed and was adjusted prior to testing.", on: true },
  { id: "c12", cat: "Adjustments", text: "No change in rev time or belt length.", on: true },
  { id: "c13", cat: "Faults", text: "Found integrator with a loadcell fault \u2014 worth monitoring for recurrence.", on: true },
  { id: "c14", cat: "Faults", text: "Integrator display is starting to get heat damage on one side.", on: true },
  { id: "c15", cat: "Faults", text: "Speed sensor can't be greased due to access restrictions. This should be monitored.", on: true },
  { id: "c16", cat: "Faults", text: "A return roller in the weigh area is causing vibration issues \u2014 recommended to be moved.", on: true },
  { id: "c17", cat: "Access", text: "Conveyor walkway barricaded off due to rusted cross beams.", on: true },
  { id: "c18", cat: "Access", text: "Access restrictions prevented [TASK] from being completed.", on: true },
  { id: "c19", cat: "Recommendations", text: "Roller replacement recommended \u2014 refer to recommended change date.", on: true },
  { id: "c20", cat: "Recommendations", text: "Speed sensor greasing required at next available opportunity.", on: true },
  { id: "c21", cat: "Recommendations", text: "Load cell readings should be monitored for drift at next service.", on: true },
  { id: "c22", cat: "Recommendations", text: "See previous report comment below.", on: true },
];

export const INIT_TEMPLATES = [
  {
    id: "tpl_mt9101", name: "Microtech 9101", desc: "Standard Microtech 9101 integrator", equipmentType: "belt_weigher", isDefault: true, params: [
      { id: "p1", name: "Scale Capacity", unit: "t/h" }, { id: "p2", name: "Totaliser", unit: "t" }, { id: "p3", name: "Scale Code", unit: "" },
      { id: "p4", name: "Revolution Time", unit: "s" }, { id: "p5", name: "Test Revolutions", unit: "revs" }, { id: "p6", name: "Test Duration Pulses", unit: "" },
      { id: "p7", name: "Speed Input Hz", unit: "Hz" }, { id: "p8", name: "Incline Angle", unit: "\u00b0" }, { id: "p9", name: "LC mV @ Zero", unit: "mV" },
      { id: "p10", name: "LC mV @ Span", unit: "mV" }, { id: "p11", name: "Idler Spacing", unit: "mm" }, { id: "p12", name: "Weigh Span", unit: "m" },
      { id: "p13", name: "Belt Speed", unit: "m/s" }, { id: "p14", name: "Belt Length", unit: "m" }, { id: "p15", name: "Test Length", unit: "m" },
      { id: "p16", name: "Test Time", unit: "s" }, { id: "p17", name: "Kg/m", unit: "kg/m" }, { id: "p18", name: "Target Weight", unit: "t" },
      { id: "p19", name: "Simulated Rate", unit: "t/h" },
    ]
  },
  {
    id: "tpl_schenck", name: "Schenck Tersus", desc: "Schenck Tersus with extended block data", equipmentType: "belt_weigher", isDefault: true, params: [
      { id: "s1", name: "Scale Capacity", unit: "t/h" }, { id: "s2", name: "Totaliser", unit: "t" }, { id: "s3", name: "Revolution Time", unit: "s" },
      { id: "s4", name: "Test Revolutions", unit: "revs" }, { id: "s5", name: "Impulses/Belt", unit: "" }, { id: "s6", name: "Speed Input Hz", unit: "Hz" },
      { id: "s7", name: "Incline Angle", unit: "\u00b0" }, { id: "s8", name: "LC mV/V @ Zero", unit: "mV" }, { id: "s9", name: "LC mV/V @ Span", unit: "mV" },
      { id: "s10", name: "Idler Spacing", unit: "mm" }, { id: "s11", name: "Weigh Span", unit: "m" }, { id: "s12", name: "Belt Speed", unit: "m/s" },
      { id: "s13", name: "Belt Length", unit: "m" }, { id: "s14", name: "Test Length", unit: "m" }, { id: "s15", name: "Test Time", unit: "s" },
      { id: "s16", name: "Kg/m", unit: "kg/m" }, { id: "s17", name: "Target Weight", unit: "t" }, { id: "s18", name: "Simulated Rate", unit: "t/h" },
    ]
  },
  // TMD Templates
  {
    id: "tpl_tmd_standard", name: "TMD Standard", desc: "Standard Tramp Metal Detector template", equipmentType: "tmd", isDefault: true, params: [
      { id: "t1", name: "Coarse", unit: "", type: "cal" },
      { id: "t2", name: "Fine", unit: "", type: "cal" },
      { id: "t3", name: "Test Piece Pass", unit: "", type: "val" },
      { id: "t4", name: "Test Piece Detect", unit: "", type: "val" },
      { id: "t5", name: "Coil Balance", unit: "", type: "val" },
      { id: "t6", name: "Belt Speed", unit: "m/s", type: "val" },
      { id: "t7", name: "Bar Detection", unit: "", type: "val" },
      { id: "t8", name: "Mat Code", unit: "", type: "val" },
      { id: "t9", name: "Bar Sensitivity", unit: "", type: "val" },
      { id: "t10", name: "Time Delay", unit: "m", type: "val" },
      { id: "t11", name: "Bar Length", unit: "m", type: "val" },
      { id: "t12", name: "OP FRQ", unit: "", type: "val" },
    ]
  },
];

export const INIT_CATEGORIES = ["Cleaning", "Calibration", "Adjustments", "Faults", "Access", "Recommendations"];

export const INIT_UNITS = ["", "t/h", "t", "s", "revs", "Hz", "\u00b0", "mV", "mV/V", "mm", "m", "m/s", "kg/m", "kg", "I/m", "I/B", "%", "% Q", "lb"];
