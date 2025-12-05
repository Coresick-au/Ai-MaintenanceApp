import React, { useRef } from 'react';
// ==========================================
// IMPORTANT: LAYOUT SYNCHRONIZATION
// Changes made to the Report Preview Layout (this file) MUST be mirrored 
// in the PDF Export (MaintenanceReportPDF.tsx) to ensure Visual Consistency.
// ==========================================
import { Modal, Button } from './UIComponents';
import { Icons } from '../constants/icons.jsx';
import { formatDate } from '../utils/helpers';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { pdf } from '@react-pdf/renderer';
import MaintenanceReportPDF from './MaintenanceReportPDF';

export const CustomerReportModal = ({
    isOpen,
    onClose,
    site,
    serviceData,
    rollerData,
    specData
}) => {
    const modalContainerRef = useRef(null);
    const reportContentRef = useRef(null);

    if (!isOpen || !site) return null;

    // Sort and filter data at the top
    const sortByDue = (a, b) => {
        if (a.remaining < 0 && b.remaining >= 0) return -1;
        if (a.remaining >= 0 && b.remaining < 0) return 1;
        if (a.remaining >= 0 && b.remaining < 30 && b.remaining >= 30) return -1;
        if (a.remaining >= 30 && b.remaining >= 0 && b.remaining < 30) return 1;
        return a.remaining - b.remaining;
    };

    const sortedService = [...serviceData].filter(a => a.active !== false).sort(sortByDue);
    const sortedRoller = [...rollerData].filter(a => a.active !== false).sort(sortByDue);

    const handlePrint = async (event) => {
        let originalHTML;
        try {
            // Show loading state
            const button = event.currentTarget;
            originalHTML = button.innerHTML;
            button.innerHTML = '<Icons.Loader className="animate-spin" size={18} /> Generating PDF...';
            button.disabled = true;

            // Create PDF using react-pdf
            const blob = await pdf((
                <MaintenanceReportPDF
                    site={{
                        ...site,
                        serviceData,
                        rollerData
                    }}
                    generatedDate={formatDate(new Date().toISOString())}
                />
            )).toBlob();

            // Generate filename and download
            const fileName = `maintenance-report-${site.customer}-${site.name}-${new Date().toISOString().split('T')[0]}.pdf`;
            saveAs(blob, fileName);

        } catch (error) {
            console.error('PDF generation failed:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            // Reset button
            if (event && event.currentTarget && originalHTML) {
                event.currentTarget.innerHTML = originalHTML;
                event.currentTarget.disabled = false;
            }
        }
    };

    const handleExcelExport = () => {
        // Create workbook with comprehensive maintenance report data
        const wb = XLSX.utils.book_new();

        // === SHEET 1: EXECUTIVE SUMMARY ===
        const summaryData = [
            ['MAINTENANCE REPORT - EXECUTIVE SUMMARY'],
            [''],
            ['Site Information'],
            ['Customer', site.customer || ''],
            ['Site Name', site.name || ''],
            ['Location', site.location || ''],
            ['Generated Date', formatDate(new Date().toISOString())],
            [''],
            ['Asset Summary'],
            ['Total Service Equipment', sortedService.length],
            ['Total Roller Equipment', sortedRoller.length],
            ['Total Assets', sortedService.length + sortedRoller.length],
            ['Critical (Overdue)', [...sortedService, ...sortedRoller].filter(i => i.remaining < 0).length],
            ['Due Soon (0-30 days)', [...sortedService, ...sortedRoller].filter(i => i.remaining >= 0 && i.remaining < 30).length],
            ['Operational', [...sortedService, ...sortedRoller].filter(i => i.remaining >= 30).length],
            [''],
            ['Health Distribution'],
            ['Critical Percentage', Math.round((([...sortedService, ...sortedRoller].filter(i => i.remaining < 0).length / (sortedService.length + sortedRoller.length)) * 100) || 0) + '%'],
            ['Warning Percentage', Math.round((([...sortedService, ...sortedRoller].filter(i => i.remaining >= 0 && i.remaining < 30).length / (sortedService.length + sortedRoller.length)) * 100) || 0) + '%'],
            ['Healthy Percentage', Math.round((([...sortedService, ...sortedRoller].filter(i => i.remaining >= 30).length / (sortedService.length + sortedRoller.length)) * 100) || 0) + '%']
        ];
        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Executive Summary');

        // === SHEET 2: SERVICE EQUIPMENT DETAILS ===
        const serviceData = [
            ['SERVICE EQUIPMENT - MAINTENANCE SCHEDULE'],
            [''],
            ['Asset Name', 'Code', 'Frequency', 'Last Service Date', 'Due Date', 'Days Remaining', 'Status', 'Operational Status', 'Operational Notes', 'Weigher ID', 'Active Status']
        ];
        
        sortedService.forEach(item => {
            serviceData.push([
                item.name || '',
                item.code || '',
                item.frequency || '',
                formatDate(item.lastCal),
                formatDate(item.dueDate),
                item.remaining || 0,
                item.remaining < 0 ? 'OVERDUE' : item.remaining < 30 ? 'DUE SOON' : 'OPERATIONAL',
                item.opStatus || 'OPERATIONAL',
                item.opNote || '',
                item.weigher || '',
                item.active !== false ? 'Active' : 'Inactive'
            ]);
        });
        
        const serviceWs = XLSX.utils.aoa_to_sheet(serviceData);
        XLSX.utils.book_append_sheet(wb, serviceWs, 'Service Equipment');

        // === SHEET 3: ROLLER EQUIPMENT DETAILS ===
        const rollerData = [
            ['ROLLER EQUIPMENT - MAINTENANCE SCHEDULE'],
            [''],
            ['Asset Name', 'Code', 'Frequency', 'Last Service Date', 'Due Date', 'Days Remaining', 'Status', 'Operational Status', 'Operational Notes', 'Weigher ID', 'Active Status']
        ];
        
        sortedRoller.forEach(item => {
            rollerData.push([
                item.name || '',
                item.code || '',
                item.frequency || '',
                formatDate(item.lastCal),
                formatDate(item.dueDate),
                item.remaining || 0,
                item.remaining < 0 ? 'OVERDUE' : item.remaining < 30 ? 'DUE SOON' : 'OPERATIONAL',
                item.opStatus || 'OPERATIONAL',
                item.opNote || '',
                item.weigher || '',
                item.active !== false ? 'Active' : 'Inactive'
            ]);
        });
        
        const rollerWs = XLSX.utils.aoa_to_sheet(rollerData);
        XLSX.utils.book_append_sheet(wb, rollerWs, 'Roller Equipment');

        // === SHEET 4: EQUIPMENT SPECIFICATIONS ===
        const specDataExport = [
            ['EQUIPMENT SPECIFICATIONS'],
            [''],
            ['Asset Name', 'Asset Code', 'Weigher ID', 'Description', 'Scale Type', 'Integrator Controller', 'Speed Sensor Type', 'Load Cell Brand', 'Load Cell Size', 'Load Cell Sensitivity', 'Number of Load Cells', 'Roller Dimensions (Dia x Face x B2B x Total x Shaft x Slot (#) Adjustment Type)', 'Adjustment Type', 'Billet Weight Type', 'Billet Weight Size', 'Billet Weight IDs', 'Notes Count']
        ];
        
        // Combine all assets and match with specs
        const allAssets = [...sortedService, ...sortedRoller];
        allAssets.forEach(asset => {
            const spec = (specData || []).find(s => 
                s.weigher === asset.weigher || 
                s.altCode === asset.code || 
                s.weigher === asset.code
            );
            
            if (spec) {
                specDataExport.push([
                    asset.name || '',
                    asset.code || '',
                    spec.weigher || '',
                    spec.description || '',
                    spec.scaleType || '',
                    spec.integratorController || '',
                    spec.speedSensorType || '',
                    spec.loadCellBrand || '',
                    spec.loadCellSize || '',
                    spec.loadCellSensitivity || '',
                    spec.numberOfLoadCells || '',
                    spec.rollDims || '',
                    spec.adjustmentType || '',
                    spec.billetWeightType || '',
                    spec.billetWeightSize || '',
                    (spec.billetWeightIds || []).join('; ') || '',
                    (spec.notes || []).length || 0
                ]);
            }
        });
        
        const specWs = XLSX.utils.aoa_to_sheet(specDataExport);
        XLSX.utils.book_append_sheet(wb, specWs, 'Specifications');

        // === SHEET 5: CRITICAL ASSETS ALERT ===
        const criticalAssets = [...sortedService, ...sortedRoller].filter(i => i.remaining < 0 || i.opStatus === 'Down');
        const criticalData = [
            ['CRITICAL ASSETS - IMMEDIATE ATTENTION REQUIRED'],
            [''],
            ['Asset Name', 'Code', 'Type', 'Days Overdue', 'Operational Status', 'Operational Notes', 'Last Service', 'Due Date', 'Weigher ID']
        ];
        
        criticalAssets.forEach(item => {
            criticalData.push([
                item.name || '',
                item.code || '',
                sortedService.includes(item) ? 'Service Equipment' : 'Roller Equipment',
                item.remaining < 0 ? `${Math.abs(item.remaining)} days overdue` : '0',
                item.opStatus || 'OPERATIONAL',
                item.opNote || '',
                formatDate(item.lastCal),
                formatDate(item.dueDate),
                item.weigher || ''
            ]);
        });
        
        const criticalWs = XLSX.utils.aoa_to_sheet(criticalData);
        XLSX.utils.book_append_sheet(wb, criticalWs, 'Critical Assets');

        // === SHEET 6: DUE SOON ASSETS ===
        const dueSoonAssets = [...sortedService, ...sortedRoller].filter(i => i.remaining >= 0 && i.remaining < 30);
        const dueSoonData = [
            ['ASSETS DUE SOON - SCHEDULE WITHIN 30 DAYS'],
            [''],
            ['Asset Name', 'Code', 'Type', 'Days Remaining', 'Operational Status', 'Last Service', 'Due Date', 'Weigher ID']
        ];
        
        dueSoonAssets.forEach(item => {
            dueSoonData.push([
                item.name || '',
                item.code || '',
                sortedService.includes(item) ? 'Service Equipment' : 'Roller Equipment',
                `${item.remaining} days`,
                item.opStatus || 'OPERATIONAL',
                formatDate(item.lastCal),
                formatDate(item.dueDate),
                item.weigher || ''
            ]);
        });
        
        const dueSoonWs = XLSX.utils.aoa_to_sheet(dueSoonData);
        XLSX.utils.book_append_sheet(wb, dueSoonWs, 'Due Soon');

        // Generate filename and download
        const fileName = `maintenance-report-${site.customer}-${site.name}-${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    // Helper for operational status text
    const getStatusText = (opStatus) => {
        if (opStatus === 'Down') return 'DOWN/CRITICAL';
        if (opStatus === 'Warning') return 'WARNING';
        return 'OPERATIONAL';
    };

    // Helper for preview status text and color (STRICTLY OPERATION STATUS)
    const getPreviewStatus = (item) => {
        if (item.opStatus === 'Down') return 'DOWN/CRITICAL';
        if (item.opStatus === 'Warning') return 'WARNING';
        return 'OPERATIONAL';
    };

    const getPreviewColor = (item) => {
        if (item.opStatus === 'Down') return 'bg-red-100 text-red-800';
        if (item.opStatus === 'Warning') return 'bg-amber-100 text-amber-800';
        return 'bg-green-100 text-green-800';
    };

    return (
        <div ref={modalContainerRef} className="print-content fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:p-0 print:bg-white print:absolute print:inset-0 print:z-[9999]">

            {/* --- PREVIEW CONTAINER (Screen Mode) --- */}
            <div className="print-content-inner bg-slate-800 w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl overflow-auto flex flex-col print:h-auto print:shadow-none print:rounded-none print:w-full print:max-w-none print:bg-white">

                {/* --- MODAL HEADER (Hidden on Print) --- */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900 print:hidden">
                    <div>
                        <h3 className="font-bold text-lg text-slate-200 print:text-black">Report Preview</h3>
                        <p className="text-sm text-slate-400 print:text-black">Review the layout before printing.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleExcelExport} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                            <Icons.Download size={18} /> Export Excel
                        </button>
                        <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                            <Icons.Printer size={18} /> Print to PDF
                        </button>
                        <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-slate-300 print:text-black px-4 py-2 rounded-lg font-bold transition-colors">
                            Close
                        </button>
                    </div>
                </div>

                {/* --- DOCUMENT CONTENT FOR PDF GENERATION --- */}
                <div ref={reportContentRef} className="bg-white text-black" style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
                    <div className="max-w-4xl mx-auto">

                        {/* DOCUMENT HEADER */}
                        <header className="border-b-2 border-gray-300 pb-6 mb-8 flex justify-between items-end">
                            <div>
                                <h1 className="text-3xl font-black uppercase tracking-wider text-black mb-1">Maintenance Report</h1>
                                <div className="text-black font-medium">{site.customer} | {site.name}</div>
                                <div className="text-sm text-black mt-1">
                                    <span>📍 </span>
                                    {site.location}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-black font-medium">Generated Date</div>
                                <div className="text-black">{formatDate(new Date().toISOString())}</div>
                                <div className="mt-2 font-bold text-blue-600 text-sm">ACCURATE INDUSTRIES</div>
                            </div>
                        </header>

                        {/* EXECUTIVE SUMMARY */}
                        {/* EXECUTIVE SUMMARY */}
                        {(() => {
                            const allAssets = [...sortedService, ...sortedRoller];
                            const totalAssets = allAssets.length;
                            const criticalCount = allAssets.filter(i => i.remaining < 0).length;
                            const warningCount = allAssets.filter(i => i.remaining >= 0 && i.remaining < 30).length;
                            const healthyCount = allAssets.filter(i => i.remaining >= 30).length;

                            const criticalPct = totalAssets > 0 ? Math.round((criticalCount / totalAssets) * 100) : 0;
                            const warningPct = totalAssets > 0 ? Math.round((warningCount / totalAssets) * 100) : 0;
                            const healthyPct = totalAssets > 0 ? Math.round((healthyCount / totalAssets) * 100) : 0;

                            return (
                                <section className="mb-8">
                                    <div className="grid grid-cols-3 gap-6 mb-6">
                                        <div className="p-4 border border-gray-300 rounded bg-white">
                                            <div className="text-xs font-bold text-black uppercase">Total Assets</div>
                                            <div className="text-2xl font-bold text-black">{totalAssets}</div>
                                        </div>
                                        <div className="p-4 border border-gray-300 rounded bg-white">
                                            <div className="text-xs font-bold text-black uppercase">Critical Attention</div>
                                            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
                                        </div>
                                        <div className="p-4 border border-gray-300 rounded bg-white">
                                            <div className="text-xs font-bold text-black uppercase">Due &lt; 30 Days</div>
                                            <div className="text-2xl font-bold text-amber-600">{warningCount}</div>
                                        </div>
                                    </div>

                                    <div className="p-4 border border-gray-300 rounded bg-white">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Overall Health</span>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-xs text-red-600 font-medium">{criticalPct}%</span></div>
                                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div><span className="text-xs text-amber-600 font-medium">{warningPct}%</span></div>
                                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-xs text-green-600 font-medium">{healthyPct}%</span></div>
                                            </div>
                                        </div>
                                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex">
                                            <div className="bg-red-500 transition-all duration-500" style={{ width: `${criticalPct}%` }}></div>
                                            <div className="bg-amber-500 transition-all duration-500" style={{ width: `${warningPct}%` }}></div>
                                            <div className="bg-green-500 transition-all duration-500" style={{ width: `${healthyPct}%` }}></div>
                                        </div>
                                        <div className="mt-2 text-center text-xs text-gray-400">
                                            <span className="font-bold text-red-600 text-sm">{criticalPct}% Critical</span> ({criticalCount} assets)
                                        </div>
                                    </div>
                                </section>
                            );
                        })()}

                        {/* SERVICE SCHEDULE */}
                        <section className="mb-10">
                            <h2 className="text-xl font-bold text-black border-b border-gray-300 pb-2 mb-4">
                                Service & Calibration Schedule
                            </h2>
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-300 text-black uppercase text-xs tracking-wider">
                                        <th className="py-2 font-bold">Asset Name</th>
                                        <th className="py-2 font-bold">Code</th>
                                        <th className="py-2 font-bold">Last Service</th>
                                        <th className="py-2 font-bold">Due Date</th>
                                        <th className="py-2 font-bold text-right">Operation Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-300">
                                    {sortedService.map((item) => (
                                        <React.Fragment key={item.id}>
                                            <tr className="border-b border-gray-200">
                                                <td className="py-3 font-semibold text-black">{item.name}</td>
                                                <td className="py-3 font-mono text-black text-xs">{item.code}</td>
                                                <td className="py-3 text-black">{formatDate(item.lastCal)}</td>
                                                <td className="py-3 text-black font-medium">
                                                    {item.remaining < 0 ? (
                                                        <span className="text-red-700 font-bold border border-red-500 rounded px-1.5 py-0.5 inline-block">
                                                            {formatDate(item.dueDate)}
                                                        </span>
                                                    ) : (
                                                        formatDate(item.dueDate)
                                                    )}
                                                </td>
                                                <td className="py-3 text-right">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${getPreviewColor(item)}`}>
                                                        {getPreviewStatus(item)}
                                                    </span>
                                                </td>
                                            </tr>
                                            {(item.opStatus === 'Down' || item.opStatus === 'Warning') && item.opNote && (
                                                <tr className="border-b border-gray-200 bg-red-50/50">
                                                    <td colSpan="5" className="py-2 px-4 text-xs italic text-slate-600">
                                                        <span className="font-bold text-red-800">Comment:</span> {item.opNote}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        {/* ROLLER SCHEDULE */}
                        {sortedRoller.length > 0 && (
                            <section className="mb-10">
                                <h2 className="text-xl font-bold text-black border-b border-gray-300 pb-2 mb-4">
                                    Roller Maintenance Schedule
                                </h2>
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-300 text-black uppercase text-xs tracking-wider">
                                            <th className="py-2 font-bold">Asset Name</th>
                                            <th className="py-2 font-bold">Code</th>
                                            <th className="py-2 font-bold">Last Service</th>
                                            <th className="py-2 font-bold">Due Date</th>
                                            <th className="py-2 font-bold text-right">Operation Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-300">
                                        {sortedRoller.map((item) => (
                                            <React.Fragment key={item.id}>
                                                <tr className="border-b border-gray-200">
                                                    <td className="py-3 font-semibold text-black">{item.name}</td>
                                                    <td className="py-3 font-mono text-black text-xs">{item.code}</td>
                                                    <td className="py-3 text-black">{formatDate(item.lastCal)}</td>
                                                    <td className="py-3 text-black font-medium">
                                                        {item.remaining < 0 ? (
                                                            <span className="text-red-700 font-bold border border-red-500 rounded px-1.5 py-0.5 inline-block">
                                                                {formatDate(item.dueDate)}
                                                            </span>
                                                        ) : (
                                                            formatDate(item.dueDate)
                                                        )}
                                                    </td>
                                                    <td className="py-3 text-right">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${getPreviewColor(item)}`}>
                                                            {getPreviewStatus(item)}
                                                        </span>
                                                    </td>
                                                </tr>
                                                {(item.opStatus === 'Down' || item.opStatus === 'Warning') && item.opNote && (
                                                    <tr className="border-b border-gray-200 bg-red-50/50">
                                                        <td colSpan="5" className="py-2 px-4 text-xs italic text-slate-600">
                                                            <span className="font-bold text-red-800">Comment:</span> {item.opNote}
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </section>
                        )}

                        {/* FOOTER */}
                        <footer className="mt-12 pt-6 border-t border-gray-300 text-center text-sm text-gray-600">
                            <p>Generated on {formatDate(new Date().toISOString())}</p>
                            <p className="mt-1">© 2024 Accurate Industries - Maintenance Report</p>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    );
};
