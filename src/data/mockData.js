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
    const tareDrift = (Math.random() * 1.5 - 0.5).toFixed(2);
    const spanDrift = (Math.random() * 1.0 - 0.4).toFixed(2);

    // 2. Signal Health (mV/V)
    // Zero usually around 8-9mV, Span around 12-13mV
    const zeroMV = (8.3 + Math.random() * 0.4).toFixed(2);
    const spanMV = (12.4 + Math.random() * 0.3).toFixed(2);

    // 3. Belt Speed (m/s) - usually constant, maybe slight variation
    const speed = (5.7 + Math.random() * 0.3).toFixed(2);

    // 4. Throughput (Tonnes since last service)
    const throughput = Math.floor(40000 + Math.random() * 40000);

    // Random comments
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

    const shouldHaveComment = Math.random() > 0.6; // 40% chance of comment
    const comments = shouldHaveComment ? [
      {
        id: 1,
        text: commentOptions[Math.floor(Math.random() * commentOptions.length)],
        status: Math.random() > 0.5 ? "Open" : "Resolved"
      }
    ] : [];

    const techNames = ["C. Bateman", "J. Smith", "M. Johnson", "A. Williams", "R. Brown"];

    reports.push({
      id: `rep-${date.getTime()}-${Math.random().toString(36).substr(2, 5)}`,
      date: date.toISOString().split('T')[0],
      fileName: `Calibration-${date.toISOString().split('T')[0]}.pdf`,
      technician: techNames[Math.floor(Math.random() * techNames.length)],
      // The Critical Data Points
      tareChange: parseFloat(tareDrift),
      spanChange: parseFloat(spanDrift),
      zeroMV: parseFloat(zeroMV),
      spanMV: parseFloat(spanMV),
      speed: parseFloat(speed),
      throughput: throughput,
      comments: comments
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
    billetType: ['Steel Round', 'Aluminum Square', 'Copper Hex', 'Brass Flat', 'Stainless Rod'][i % 5],
    billetWeight: `${500 + i * 50} kg`,
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
    billetType: ['Steel Round', 'Aluminum Square', 'Copper Hex', 'Brass Flat', 'Stainless Rod'][i % 5],
    billetWeight: `${500 + i * 50} kg`,
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
