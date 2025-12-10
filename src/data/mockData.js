// src/data/mockData.js

// ==========================================
// HELPER: RECALCULATE ROW
// ==========================================
export const recalculateRow = (row) => {
  if (!row.lastCal || !row.frequency) return row;

  const lastCalDate = new Date(row.lastCal);
  const dueDate = new Date(lastCalDate);
  dueDate.setMonth(dueDate.getMonth() + parseInt(row.frequency));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    ...row,
    dueDate: dueDate.toISOString().split('T')[0],
    remaining: diffDays
  };
};

// ==========================================
// HELPER: GENERATE SAMPLE REPORTS
// ==========================================
const generateSampleReports = (startDate, numReports = 4) => {
  const reports = [];
  const monthsBack = [9, 6, 3, 0]; // Last 4 quarters by default

  for (let i = 0; i < numReports; i++) {
    const monthOffset = monthsBack[i] || (numReports - i - 1) * 3;
    const date = new Date(startDate.getFullYear(), startDate.getMonth() - monthOffset, Math.floor(Math.random() * 28) + 1);

    // 1. Calibration Drift (Tare/Span %)
    // Realistic drift: usually small, occasionally larger
    const oldTare = (1000 + Math.random() * 500).toFixed(1);
    const newTare = (parseFloat(oldTare) + (Math.random() * 20 - 10)).toFixed(1);
    const tareChange = ((parseFloat(newTare) - parseFloat(oldTare)) / parseFloat(oldTare) * 100).toFixed(2);

    const oldSpan = (5000 + Math.random() * 1000).toFixed(1);
    const newSpan = (parseFloat(oldSpan) + (Math.random() * 50 - 25)).toFixed(1);
    const spanChange = ((parseFloat(newSpan) - parseFloat(oldSpan)) / parseFloat(oldSpan) * 100).toFixed(2);

    // 2. Repeatability values
    const tareRepeatability = (Math.random() * 0.2).toFixed(3);
    const spanRepeatability = (Math.random() * 0.3).toFixed(3);

    // 3. Load Cell signals (mV/V)
    const lcMvZero = (8.3 + Math.random() * 0.4).toFixed(2);
    const lcMvSpan = (12.4 + Math.random() * 0.3).toFixed(2);

    // 4. Belt & Speed data
    const beltSpeed = (2.5 + Math.random() * 0.5).toFixed(2);
    const beltLength = (50 + Math.random() * 20).toFixed(1);
    const testLength = (10 + Math.random() * 5).toFixed(1);
    const testTime = (testLength / beltSpeed).toFixed(1);

    // System Tests data
    const totaliserAsLeft = Math.floor(100000 + Math.random() * 50000);
    const revTime = (60 + Math.random() * 20).toFixed(1);
    const testRevolutions = Math.floor(5 + Math.random() * 3);
    const pulses = testRevolutions * Math.floor(1000 + Math.random() * 500);
    const simulatedRate = (100 + Math.random() * 50).toFixed(1);
    const targetWeight = (testLength * (100 + Math.random() * 50)).toFixed(1);
    const totaliser = Math.floor(40000 + Math.random() * 40000);

    // 6. Scale condition descriptions
    const scaleConditions = [
      "Scale in good condition, minor belt wear visible",
      "Excellent condition, all components operating normally",
      "Some buildup on weigh frame, cleaned during service",
      "Belt tracking slightly off, adjusted during calibration",
      "Load cell access covers showing corrosion, sealed",
      "Idler rollers showing wear, noted for next maintenance"
    ];

    // 7. Comments and recommendations
    const commentOptions = [
      "Spiral cage speed sensor bearings noisy.",
      "Load cell cable showing wear, recommend replacement.",
      "Idler rollers adjusted, belt tracking improved.",
      "Zero drift detected, recalibrated successfully.",
      "Belt speed sensor cleaned and realigned.",
      "No issues found, system operating normally.",
      "Span adjustment required due to material density change.",
      "Junction box moisture detected, sealed and dried."
    ];

    const recommendationOptions = [
      "Schedule load cell replacement within 6 months",
      "Monitor belt wear, consider replacement at next service",
      "Clean speed sensor quarterly to prevent drift",
      "Check idler roller bearings at next maintenance",
      "No immediate action required, continue normal monitoring",
      "Upgrade to newer load cell model for improved accuracy"
    ];

    const shouldHaveComment = Math.random() > 0.6; // 40% chance of comment
    const comments = shouldHaveComment ? [
      {
        id: 1,
        text: commentOptions[Math.floor(Math.random() * commentOptions.length)],
        status: Math.random() > 0.5 ? "Open" : "Resolved"
      }
    ] : [];

    // Use generic system identifier instead of hardcoded employee names
    const jobNumbers = ["251486", "251487", "251488", "251489", "251490"];
    const jobCodes = ["cv06", "cv07", "cv08", "cv09", "cv10"];

    const selectedTech = "System Generated"; // Generic identifier instead of employee names
    const selectedJobNumber = jobNumbers[Math.floor(Math.random() * jobNumbers.length)];
    const selectedJobCode = jobCodes[Math.floor(Math.random() * jobCodes.length)];
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '.');

    reports.push({
      id: `rep-${date.getTime()}-${Math.random().toString(36).substr(2, 5)}`,
      date: date.toISOString().split('T')[0],
      fileName: `${dateStr}-CALR-${selectedJobNumber}-${selectedJobCode}.pdf`,
      technician: selectedTech,

      // Basic Info
      scaleCondition: scaleConditions[Math.floor(Math.random() * scaleConditions.length)],

      // Tare/Zero
      oldTare: oldTare,
      newTare: newTare,
      tareChange: parseFloat(tareChange),
      tareRepeatability: tareRepeatability,

      // Span
      oldSpan: oldSpan,
      newSpan: newSpan,
      spanChange: parseFloat(spanChange),
      spanRepeatability: spanRepeatability,

      // Load Cell
      lcMvZero: lcMvZero,
      lcMvSpan: lcMvSpan,

      // Belt & Speed
      beltSpeed: parseFloat(beltSpeed),
      beltLength: parseFloat(beltLength),
      testLength: parseFloat(testLength),
      testTime: parseFloat(testTime),

      // System Tests
      totaliserAsLeft: totaliserAsLeft,
      revTime: parseFloat(revTime),
      testRevolutions: testRevolutions,
      pulses: pulses,
      simulatedRate: parseFloat(simulatedRate),
      targetWeight: parseFloat(targetWeight),
      totaliser: totaliser,

      // Comments and Recommendations
      comments: comments,
      recommendations: recommendationOptions[Math.floor(Math.random() * recommendationOptions.length)],

      // File naming
      jobNumber: selectedJobNumber,
      jobCode: selectedJobCode,

      // Legacy fields for compatibility
      zeroMV: lcMvZero,
      spanMV: lcMvSpan,
      speed: parseFloat(beltSpeed),
      throughput: totaliser
    });
  }

  return reports.sort((a, b) => new Date(a.date) - new Date(b.date));
};

// ==========================================
// HELPER: GENERATE SAMPLE SITE WITH LINKED ASSETS
// ==========================================
export const generateSampleSite = () => {
  const id = Math.random().toString(36).substr(2, 9);
  const now = new Date();

  // Random number of assets between 10 and 18 for comprehensive demo
  const numAssets = Math.floor(Math.random() * 9) + 10;

  // Generate assets with SHARED base IDs so service and roller data stay synced
  const baseIds = Array.from({ length: numAssets }, () => Math.random().toString(36).substr(2, 9));

  const serviceData = [];
  const rollerData = [];

  baseIds.forEach((baseId, i) => {
    const daysAgo = 90 + (i * 30) + Math.floor(Math.random() * 20);
    const lastCalDate = new Date(now);
    lastCalDate.setDate(lastCalDate.getDate() - daysAgo);

    const assetName = `Sample Asset ${i + 1}`;
    const assetCode = `SAMPLE-${String(i + 1).padStart(3, '0')}`;
    const weigher = `W${i + 1}`;

    // Generate random number of reports (3-7)
    const numReports = Math.floor(Math.random() * 5) + 3;
    const reports = generateSampleReports(lastCalDate, numReports);

    // Service asset
    serviceData.push(recalculateRow({
      id: `s-${baseId}`,
      name: assetName,
      weigher: weigher,
      code: assetCode,
      lastCal: lastCalDate.toISOString().split('T')[0],
      frequency: 3,
      active: true,
      history: [
        {
          date: lastCalDate.toISOString(),
          action: 'Asset Created',
          user: 'System'
        }
      ],
      reports: JSON.parse(JSON.stringify(reports)) // Deep clone
    }));

    // Roller asset (same base data, different ID prefix)
    rollerData.push(recalculateRow({
      id: `r-${baseId}`,
      name: assetName,
      weigher: weigher,
      code: assetCode,
      lastCal: lastCalDate.toISOString().split('T')[0],
      frequency: 12,
      active: true,
      history: [
        {
          date: lastCalDate.toISOString(),
          action: 'Asset Created',
          user: 'System'
        }
      ],
      reports: JSON.parse(JSON.stringify(reports)) // Deep clone
    }));
  });

  // Generate spec data inline (previously generateTestSpecs function)
  const specData = serviceData.map((asset, i) => ({
    id: `spec-${Math.random().toString(36).substr(2, 9)}`,
    weigher: asset.weigher,
    altCode: asset.code,
    description: asset.name,
    scaleType: ['Schenck VEG20600', 'Ramsey Micro-Tech', 'Thayer Scale', 'Siemens Milltronics', 'Hardy HI-6600'][i % 5],
    integratorController: ['Siemens S7-1200', 'Allen Bradley CompactLogix', 'Schneider M340', 'Mitsubishi FX5U', 'Omron NX'][i % 5],
    speedSensorType: ['Proximity Sensor 24VDC', 'Encoder 1024 PPR', 'Tachometer', 'Radar Speed Sensor', 'Optical Encoder'][i % 5],
    rollDims: `${100 + i * 10}mm x ${50 + i * 5}mm`,
    adjustmentType: ['Manual Screw', 'Pneumatic', 'Hydraulic', 'Electric Motor', 'Spring Loaded'][i % 5],
    loadCellBrand: ['Vishay Nobel', 'HBM', 'Scaime', 'Mettler Toledo', 'Flintec'][i % 5],
    loadCellSize: ['50 kg', '100 kg', '250 kg', '500 kg', '1000 kg'][i % 5],
    loadCellSensitivity: ['2.0 mV/V', '3.0 mV/V', '1.5 mV/V', '2.0 mV/V', '2.5 mV/V'][i % 5],
    numberOfLoadCells: [2, 4, 4, 6, 4][i % 5],
    billetWeightType: ['Steel Round', 'Aluminum Square', 'Copper Hex', 'Brass Flat', 'Stainless Rod'][i % 5],
    billetWeightSize: ['500 kg', '550 kg', '600 kg', '650 kg', '700 kg'][i % 5],
    billetWeightIds: [`BW-${1000 + i}`, `BW-${2000 + i}`],
    notes: [],
    history: [
      {
        date: new Date().toISOString(),
        action: 'Specification Created',
        user: 'System'
      }
    ]
  }));

  const customerNames = ['Acme Mining Corp', 'TechCo Industries', 'MegaMine Resources Ltd', 'Global Bulk Materials', 'Peak Coal Resources', 'Summit Mining', 'Horizon Materials', 'Continental Mining Co'];
  const siteNames = ['North Mine', 'South Processing Plant', 'East Pit Operations', 'West Crushing Facility', 'Central Distribution Hub', 'Longwall Panel', 'Open Cut Operations'];
  const cities = ['Brisbane, QLD', 'Sydney, NSW', 'Melbourne, VIC', 'Perth, WA', 'Adelaide, SA', 'Mackay, QLD', 'Townsville, QLD', 'Emerald, QLD', 'Moranbah, QLD', 'Mt Isa, QLD'];
  const positions = ['Maintenance Supervisor', 'Plant Manager', 'Chief Engineer', 'Maintenance Coordinator', 'Operations Manager', 'Technical Lead'];
  const firstNames = ['John', 'Sarah', 'Michael', 'Emma', 'David', 'Lisa', 'James', 'Rachel', 'Chris', 'Amy'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Moore', 'Taylor'];

  const customer = customerNames[Math.floor(Math.random() * customerNames.length)];
  const siteName = siteNames[Math.floor(Math.random() * siteNames.length)];
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const position = positions[Math.floor(Math.random() * positions.length)];

  // Generate multiple notes for more realistic demo
  const notes = [
    {
      id: `n-${id}-1`,
      content: `Auto-generated demo site with ${numAssets} assets. Contains comprehensive service schedules, roller replacement data, specifications, and historical reports.`,
      author: 'System',
      timestamp: new Date(now - 86400000 * 7).toISOString() // 7 days ago
    },
    {
      id: `n-${id}-2`,
      content: 'Initial site setup completed. All conveyor belt scales configured and calibrated.',
      author: firstName.charAt(0) + lastName.charAt(0),
      timestamp: new Date(now - 86400000 * 5).toISOString() // 5 days ago
    },
    {
      id: `n-${id}-3`,
      content: 'Quarterly maintenance review scheduled. All systems operational.',
      author: firstName.charAt(0) + lastName.charAt(0),
      timestamp: new Date(now - 86400000 * 2).toISOString() // 2 days ago
    }
  ];

  return {
    id: `site-sample-${id}`,
    name: `${customer} - ${siteName}`,
    customer: customer,
    location: cities[Math.floor(Math.random() * cities.length)],
    contactName: `${firstName} ${lastName}`,
    contactEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${customer.toLowerCase().replace(/\s+/g, '')}.com`,
    contactPosition: position,
    contactPhone1: `04${Math.floor(Math.random() * 90000000 + 10000000)}`,
    contactPhone2: `07 ${Math.floor(Math.random() * 9000 + 1000)} ${Math.floor(Math.random() * 9000 + 1000)}`,
    active: true,
    notes: notes,
    logo: null,
    serviceData,
    rollerData,
    specData
  };
};

// ==========================================
// HELPER: GENERATE PAIRED ASSETS FOR INITIAL SITE
// ==========================================
const generatePairedAssets = (count, daysAgoBase, baseName, baseCode) => {
  const serviceData = [];
  const rollerData = [];
  const now = new Date();

  // Generate shared base IDs for pairing
  const baseIds = Array.from({ length: count }, () => Math.random().toString(36).substr(2, 9));

  baseIds.forEach((baseId, i) => {
    const daysAgo = daysAgoBase + (i * 30) + Math.floor(Math.random() * 20);
    const lastCalDate = new Date(now);
    lastCalDate.setDate(lastCalDate.getDate() - daysAgo);

    const assetName = `${baseName} ${i + 1}`;
    const assetCode = `${baseCode}-${String(i + 1).padStart(3, '0')}`;
    const weigher = `W${i + 1}`;

    // Generate random number of reports (2-6)
    const numReports = Math.floor(Math.random() * 5) + 2;
    const reports = generateSampleReports(lastCalDate, numReports);

    // Service asset (3 month frequency)
    serviceData.push(recalculateRow({
      id: `s-${baseId}`,
      name: assetName,
      weigher: weigher,
      code: assetCode,
      lastCal: lastCalDate.toISOString().split('T')[0],
      frequency: 3,
      active: true,
      history: [
        {
          date: lastCalDate.toISOString(),
          action: 'Asset Created',
          user: 'System'
        }
      ],
      reports: JSON.parse(JSON.stringify(reports)) // Deep clone
    }));

    // Roller asset (12 month frequency) - SAME NAME, WEIGHER, CODE
    rollerData.push(recalculateRow({
      id: `r-${baseId}`,
      name: assetName,
      weigher: weigher,
      code: assetCode,
      lastCal: lastCalDate.toISOString().split('T')[0],
      frequency: 12,
      active: true,
      history: [
        {
          date: lastCalDate.toISOString(),
          action: 'Asset Created',
          user: 'System'
        }
      ],
      reports: JSON.parse(JSON.stringify(reports)) // Deep clone
    }));
  });

  return { serviceData, rollerData };
};

// ==========================================
// INITIAL SITES DATA
// ==========================================
const kestrelAssets = generatePairedAssets(5, 100, 'Conveyor', 'CV');

export const initialSites = [
  {
    id: 'site-sample-default',
    name: 'Kestrel Mine',
    customer: 'Kestrel Coal',
    location: 'Emerald, QLD',
    contactName: 'John Doe',
    contactEmail: 'j.doe@kestrel.com',
    contactPosition: 'Maintenance Super',
    contactPhone1: '0400 123 456',
    contactPhone2: '',
    active: true,
    notes: [],
    logo: '/logos/kestrel.png',
    serviceData: kestrelAssets.serviceData,
    rollerData: kestrelAssets.rollerData,
    specData: []
  }
];

// Auto-generate specs for the default site after creation
const defaultSite = initialSites[0];
defaultSite.specData = [
  ...defaultSite.serviceData.map((asset, i) => ({
    id: `spec-${Math.random().toString(36).substr(2, 9)}`,
    weigher: asset.weigher,
    altCode: asset.code,
    description: asset.name,
    scaleType: ['Schenck VEG20600', 'Ramsey Micro-Tech', 'Thayer Scale', 'Siemens Milltronics', 'Hardy HI-6600'][i % 5],
    integratorController: ['Siemens S7-1200', 'Allen Bradley CompactLogix', 'Schneider M340', 'Mitsubishi FX5U', 'Omron NX'][i % 5],
    speedSensorType: ['Proximity Sensor 24VDC', 'Encoder 1024 PPR', 'Tachometer', 'Radar Speed Sensor', 'Optical Encoder'][i % 5],
    rollDims: `${100 + i * 10}mm x ${50 + i * 5}mm`,
    adjustmentType: ['Manual Screw', 'Pneumatic', 'Hydraulic', 'Electric Motor', 'Spring Loaded'][i % 5],
    loadCellBrand: ['Vishay Nobel', 'HBM', 'Scaime', 'Mettler Toledo', 'Flintec'][i % 5],
    loadCellSize: ['50 kg', '100 kg', '250 kg', '500 kg', '1000 kg'][i % 5],
    loadCellSensitivity: ['2.0 mV/V', '3.0 mV/V', '1.5 mV/V', '2.0 mV/V', '2.5 mV/V'][i % 5],
    numberOfLoadCells: [2, 4, 4, 6, 4][i % 5],
    billetWeightType: ['Steel Round', 'Aluminum Square', 'Copper Hex', 'Brass Flat', 'Stainless Rod'][i % 5],
    billetWeightSize: ['500 kg', '550 kg', '600 kg', '650 kg', '700 kg'][i % 5],
    billetWeightIds: [`BW-${1000 + i}`, `BW-${2000 + i}`],
    notes: [],
    history: [
      {
        date: new Date().toISOString(),
        action: 'Specification Created',
        user: 'System'
      }
    ]
  }))
];
