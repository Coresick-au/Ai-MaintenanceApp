import React, { useState } from 'react';
import { PDFViewer, Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

// Import all PDF Components
import { ServiceReportFixed } from './ServiceReportFixed';
import { MaintenanceReportPDF } from './MaintenanceReportPDF';
import { JobSheetPDF } from '../apps/quoting/components/JobSheetPDF';
import { AssetSpecsPDF } from './AssetSpecsPDF';
import { FullDashboardPDF } from './FullDashboardPDF';
import { TimesheetPDF } from '../apps/TimesheetApp/components/TimesheetPDF';
import ReportPdfDocument from '../apps/reporting/pdf/ReportPdfDocument';
import { generateSampleSite } from '../data/mockData';

// --- MOCK DATA SETUP ---
const mockSite = generateSampleSite();
mockSite.logo = null; // Disable logo for dev viewer to prevent Image crash
const mockServiceDate = new Date().toLocaleDateString('en-AU');

// 1. Mock Data for Job Sheet
const mockQuote = {
    id: 'Q-1001',
    jobDetails: {
        jobNo: 'Q-1001',
        customer: mockSite.customer,
        location: mockSite.location,
        jobDescription: 'Standard Technician Job Sheet Test',
        description: 'Scope of works description here... Install new belt weigher and calibrate.',
        techNotes: 'Safety glasses required. Site induction needed.',
        date: new Date().toISOString(),
    },
    shifts: [
        {
            date: new Date().toISOString(),
            startTime: '08:00',
            finishTime: '16:00',
            tech: 'Technician A',
            dayType: 'weekday',
            isNightShift: false,
            vehicle: true
        }
    ]
};

// 2. Mock Data for Service Report
const mockServiceReportData = {
    general: {
        reportId: `REP-${Math.floor(Math.random() * 10000)}`,
        customerName: mockSite.customer,
        siteLocation: mockSite.location,
        contactName: mockSite.contacts?.[0]?.name || 'Unknown Contact',
        contactEmail: mockSite.contacts?.[0]?.email || 'unknown@example.com',
        assetName: mockSite.serviceData[0]?.name || 'Test Asset',
        conveyorNumber: mockSite.serviceData[0]?.code || 'CV-001',
        serviceDate: mockServiceDate,
        technicians: 'Tech 1, Tech 2',
        nextServiceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU'),
        comments: 'Routine service completed successfully. No major issues found.'
    },
    calibration: {
        showPercentChange: true,
    },
    calibrationRows: [
        { parameter: 'Zero', oldValue: '0.00', newValue: '0.00', percentChange: '0.00' },
        { parameter: 'Span', oldValue: '1000', newValue: '1000', percentChange: '0.00' },
        { parameter: 'Speed', oldValue: '2.5', newValue: '2.5', percentChange: '0.00' }
    ],
    integrator: [
        { label: 'Total 1', asFound: '10000', asLeft: '10050' },
        { label: 'Total 2', asFound: '5000', asLeft: '5025' }
    ]
};

// 3. Mock Data for Asset Specs
const mockAssetsWithSpecs = mockSite.serviceData.slice(0, 3).map((asset) => ({
    asset: asset,
    specs: {
        description: `Test Spec Description for ${asset.name}`,
        weigher: `W-${asset.code}`,
        scaleType: 'Multi-Idler',
        integratorController: 'Rice Lake',
        speedSensorType: 'Digital Encoder',
        loadCellBrand: 'Flintec',
        loadCellSize: '100kg',
        loadCellSensitivity: '2mV/V',
        numberOfLoadCells: '4',
        rollDims: '133x380x450',
        adjustmentType: 'Jack Screw',
        billetWeightType: 'Certified Chain',
        billetWeightSize: '25',
        billetWeightIds: ['BW-01', 'BW-02'],
        notes: [
            { id: '1', author: 'JD', content: 'Checked load cells, all good.', timestamp: new Date().toISOString() }
        ]
    }
}));

// 4. Mock Data for Timesheet
const mockTimesheetEntries = [
    {
        id: '1',
        userId: 'dev-user',
        weekKey: '2026-W01',
        day: 'Monday',
        startTime: '08:00',
        finishTime: '16:00',
        breakDuration: 0.5,
        activity: 'Site',
        jobNo: '25244',
        isNightshift: false,
        isOvernight: false,
        perDiemType: 'none',
        notes: 'Routine calibration completed'
    },
    {
        id: '2',
        userId: 'dev-user',
        weekKey: '2026-W01',
        day: 'Monday',
        startTime: '12:30',
        finishTime: '16:00',
        breakDuration: 0,
        activity: 'Travel',
        jobNo: '25243',
        isNightshift: false,
        isOvernight: false,
        perDiemType: 'half',
        notes: ''
    },
    {
        id: '3',
        userId: 'dev-user',
        weekKey: '2026-W01',
        day: 'Tuesday',
        startTime: '06:00',
        finishTime: '18:00',
        breakDuration: 0.5,
        activity: 'Site',
        jobNo: '25244',
        isNightshift: false,
        isOvernight: true,
        perDiemType: 'full',
        notes: 'Overnight stay required'
    }
];

const mockTimesheetSummary = {
    totalNetHours: 18.5,
    totalBaseHours: 15,
    totalOT15x: 2.5,
    totalOT20x: 1,
    totalPerDiem: 127.50,
    totalChargeableHours: 18.5,
    utilizationPercent: 49.3
};

// --- Render Prop Test PDF ---
const rpStyles = StyleSheet.create({
    page: { fontSize: 12, paddingTop: 40, paddingBottom: 60, paddingHorizontal: 50 },
});

const RenderPropTestPDF = () => (
    <Document title="Render Prop Test">
        <Page size="A4" style={rpStyles.page}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>Render Prop Test - Page Number Approaches</Text>

            {/* Fill page with content to force a second page */}
            {Array.from({ length: 40 }, (_, i) => (
                <Text key={i} style={{ marginBottom: 8 }}>Line {i + 1} - Lorem ipsum dolor sit amet, consectetur adipiscing elit.</Text>
            ))}

            {/* Test 1: Standalone fixed Text with render (our current approach) */}
            <Text
                fixed
                render={({ pageNumber, totalPages }) => `[Test 1 - absolute] Page ${pageNumber} of ${totalPages}`}
                style={{ position: "absolute", bottom: 45, right: 50, fontSize: 9, color: "red" }}
            />

            {/* Test 2: Fixed Text with render, NO absolute positioning */}
            <Text
                fixed
                render={({ pageNumber, totalPages }) => `[Test 2 - flow] Page ${pageNumber} of ${totalPages}`}
                style={{ fontSize: 9, color: "blue" }}
            />

            {/* Test 3: Inside a fixed View (known broken approach) */}
            <View fixed style={{ position: "absolute", bottom: 25, left: 50, right: 50 }}>
                <Text
                    render={({ pageNumber, totalPages }) => `[Test 3 - inside fixed View] Page ${pageNumber} of ${totalPages}`}
                    style={{ fontSize: 9, color: "green" }}
                />
            </View>

            {/* Test 4: Fixed View with static text (control - should always work) */}
            <View fixed style={{ position: "absolute", bottom: 10, left: 50, right: 50, flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 9, color: "#888" }}>Static footer left</Text>
                <Text style={{ fontSize: 9, color: "#888" }}>Static footer right</Text>
            </View>
        </Page>
    </Document>
);

// --- Mock data for Belt Weigher Report ---
const mockBWReport = {
    cust: { name: "Test Mining Co", location: "Mount Isa QLD", contact1: "John Smith", email1: "john@test.com", phone1: "0400 000 000", contact2: "", email2: "", phone2: "" },
    svc: { date: new Date().toISOString(), asset: "BW-001", cv: "CV-12", type: "Calibration", interval: 6, techs: ["Brad Jones - 0411111111 - brad@test.com"], jobNo: "25100" },
    cal: { oz: "0.00", nz: "0.01", os: "1000", ns: "1002", zr: "0.02", sr: "0.15", ol: "12.5", nl: "12.48", osp: "2.50", nsp: "2.51" },
    comments: "Routine calibration completed. All parameters within tolerance. Belt tracking good. Recommend roller replacement at next service.",
    ast: { scaleType: "Multi-Idler", speedIn: "Digital Encoder", scaleCond: "Good", billetType: "Chain", integrator: "Rice Lake 920i", nw: "4", nlc: "2", bs: "25", lcCap: "100kg", billetCond: "Good", lcSpecs: "2.0", nmi: "Yes", nmiCls: "0.5", rCond: "Fair", rType: "Standard", rDate: new Date(Date.now() + 180 * 86400000).toISOString(), rSize: "133x380" },
    intD: { p1: { af: "10000", al: "10050", incPct: true }, p2: { af: "5000", al: "5025", incPct: true }, p3: { af: "2.50", al: "2.51", incPct: false } },
    selTpl: { name: "Rice Lake 920i", params: [{ id: "p1", name: "Grand Total", unit: "t" }, { id: "p2", name: "Rate", unit: "t/h" }, { id: "p3", name: "Speed", unit: "m/s" }] },
    nsd: new Date(Date.now() + 180 * 86400000).toISOString(),
    zD: { diff: "0.01", pct: "0.01" }, sD: { diff: "2", pct: "0.20" },
    lD: { diff: "-0.02", pct: "0.16" }, spD: { diff: "0.01", pct: "0.40" },
    condColors: { Good: "#16a34a", Fair: "#d97706", Poor: "#dc2626" },
};

const DevPDFViewer = () => {
    const [selectedReport, setSelectedReport] = useState('render-test');
    const [debugMode, setDebugMode] = useState(false);

    const reportOptions = [
        { id: 'render-test', label: 'Render Prop Test (Page Numbers)' },
        { id: 'belt-weigher', label: 'Belt Weigher Report' },
        { id: 'job-sheet', label: 'Technician Job Sheet' },
        { id: 'timesheet', label: 'Weekly Timesheet' },
        { id: 'maintenance-report', label: 'Maintenance Report' },
        { id: 'full-dashboard', label: 'Full Dashboard Report' },
        { id: 'asset-specs', label: 'Asset Specifications' },
        { id: 'service-report', label: 'Service Report (Fixed)' },
    ];

    const renderSelectedPDF = () => {
        switch (selectedReport) {
            case 'render-test':
                return <RenderPropTestPDF />;

            case 'belt-weigher':
                return <ReportPdfDocument {...mockBWReport} />;

            case 'job-sheet':
                return <JobSheetPDF quote={mockQuote} debug={debugMode} />;

            case 'timesheet':
                return (
                    <TimesheetPDF
                        entries={mockTimesheetEntries}
                        summary={mockTimesheetSummary}
                        weekStart={new Date('2025-12-30')}
                        weekEnd={new Date('2026-01-05')}
                        employeeName="Test Technician"
                    />
                );

            case 'maintenance-report':
                return <MaintenanceReportPDF site={mockSite} generatedDate={mockServiceDate} />;

            case 'full-dashboard':
                return <FullDashboardPDF site={mockSite} generatedDate={mockServiceDate} />;

            case 'asset-specs':
                return <AssetSpecsPDF assets={mockAssetsWithSpecs} generatedDate={mockServiceDate} />;

            case 'service-report':
                return <ServiceReportFixed data={mockServiceReportData} debug={debugMode} />;

            default:
                return <JobSheetPDF quote={mockQuote} debug={debugMode} />;
        }
    };

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#1a1a1a' }}>
            {/* Control Bar */}
            <div style={{ padding: '10px 20px', backgroundColor: '#2d2d2d', borderBottom: '1px solid #404040', display: 'flex', gap: '20px', alignItems: 'center' }}>
                <h2 style={{ color: 'white', margin: 0, fontSize: '16px', fontWeight: 'bold' }}>📄 PDF Dev Environment</h2>

                <select
                    value={selectedReport}
                    onChange={(e) => setSelectedReport(e.target.value)}
                    style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: 'white' }}
                >
                    {reportOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                </select>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc', fontSize: '14px', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={debugMode}
                        onChange={(e) => setDebugMode(e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    Debug Layout
                </label>

                <div style={{ display: 'flex', gap: '5px', marginLeft: 'auto', color: '#888', fontSize: '12px' }}>
                    <span>{mockSite.customer}</span>
                    <span>•</span>
                    <span>{mockSite.location}</span>
                </div>

                <a href="/" style={{ color: '#60a5fa', textDecoration: 'none', fontSize: '14px', marginLeft: '10px' }}>Exit to App</a>
            </div>

            {/* Viewer */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <PDFViewer width="100%" height="100%" showToolbar={true}>
                    {renderSelectedPDF()}
                </PDFViewer>
            </div>
        </div>
    );
};

export default DevPDFViewer;
