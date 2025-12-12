import React, { useState, useEffect } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import { ServiceReportDocument } from './reports/ServiceReportDocument';
import { MaintenanceReportPDF } from './MaintenanceReportPDF';
import { JobSheetPDF } from '../apps/quoting/components/JobSheetPDF';
import { generateSampleSite } from '../data/mockData';

// Generate reuseable mock data
const mockSite = generateSampleSite();
mockSite.logo = null; // Disable logo for dev viewer to prevent Image crash
const mockServiceDate = new Date().toLocaleDateString('en-AU');

// Service Report Mock Data
const mockServiceReportData = {
    general: {
        reportId: `REP-${Math.floor(Math.random() * 10000)}`,
        customerName: mockSite.customer,
        customerLogo: null, // Disable logo for dev viewer to prevent Image crash
        siteLocation: mockSite.location,
        contactName: mockSite.contactName,
        contactEmail: mockSite.contactEmail,
        assetName: mockSite.serviceData[0].name,
        conveyorNumber: mockSite.serviceData[0].code,
        serviceDate: mockServiceDate,
        technicians: 'System Tech',
        nextServiceDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU'),
        comments: 'Routine maintenance completed successfully. All systems nominal.'
    },
    calibration: {
        oldTare: '1024.5',
        newTare: '1024.5',
        tareChange: '0.00',
        oldSpan: '5120.0',
        newSpan: '5125.2',
        spanChange: '0.10',
        oldSpeed: '3.5',
        newSpeed: '3.5',
        speedChange: '0.00'
    },
    integrator: [
        { label: 'Totaliser 1', asFound: '1540020', asLeft: '1540020', diff: '0' },
        { label: 'Totaliser 2', asFound: '0', asLeft: '0', diff: '-' }
    ],
    calibrationRows: [
        { parameter: 'Zero (Counts)', oldValue: '24050', newValue: '24055', percentChange: '0.02' },
        { parameter: 'Span (Counts)', oldValue: '155000', newValue: '156200', percentChange: '0.77' },
        { parameter: 'Belt Speed (m/s)', oldValue: '4.2', newValue: '4.2', percentChange: '0.00' },
        { parameter: 'Test Duration (s)', oldValue: '60.0', newValue: '60.0', percentChange: '-' }
    ]
};

// Job Sheet Mock Data
const mockQuote = {
    id: 'mock-quote-1',
    quoteNumber: 'Q-2025-001',
    lastModified: Date.now(),
    status: 'quoted',
    rates: { siteNormal: 160, weekend: 210, officeReporting: 160, travel: 120, travelChargeExBrisbane: 1.5 },
    jobDetails: {
        customer: mockSite.customer,
        jobNo: 'JOB-25-884',
        location: mockSite.location,
        techName: 'Reference',
        technicians: ['John Doe', 'Sarah Smith'],
        description: 'Quarterly compliance calibration of 5x belt scales. \n\nIncludes:\n- Zero/Span calibration\n- Mechanical inspection\n- Reporting',
        techNotes: 'Code for main gate: 1234. \n\nSite Contact: Mike (0400 000 000). \n\nSafety: High vis required at all times. Lock out isolation point L4 at crusher.',
        reportingTime: 2,
        includeTravelCharge: true,
        travelDistance: 150
    },
    shifts: [
        {
            id: 1,
            date: new Date().toISOString(),
            dayType: 'weekday',
            startTime: '06:00',
            finishTime: '16:00',
            travelIn: 1.5,
            travelOut: 1.5,
            vehicle: true,
            tech: 'John Doe',
            perDiem: false
        },
        {
            id: 2,
            date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            dayType: 'weekday',
            startTime: '06:00',
            finishTime: '14:00',
            travelIn: 1.5,
            travelOut: 1.5,
            vehicle: true,
            tech: 'Sarah Smith',
            perDiem: false
        }
    ],
    extras: [],
    internalExpenses: []
};


export const DevPDFViewer = () => {
    const [selectedReport, setSelectedReport] = useState('job-sheet');
    const [zoom, setZoom] = useState(1.0);

    const reportOptions = [
        { id: 'job-sheet', label: 'Technician Job Sheet' },
        { id: 'service-report', label: 'Service Report' },
        { id: 'maintenance-report', label: 'Maintenance Report' }
    ];

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
                    {(() => {
                        switch (selectedReport) {
                            case 'service-report':
                                return <ServiceReportDocument data={mockServiceReportData} />;
                            case 'maintenance-report':
                                return <MaintenanceReportPDF site={mockSite} generatedDate={mockServiceDate} />;
                            case 'job-sheet':
                            default:
                                return <JobSheetPDF quote={mockQuote} />;
                        }
                    })()}
                </PDFViewer>
            </div>
        </div>
    );
};

export default DevPDFViewer;
