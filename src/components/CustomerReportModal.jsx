import React, { useRef } from 'react';
import { Modal, Button } from './UIComponents';
import { Icons } from '../constants/icons.jsx';
import { formatDate } from '../utils/helpers';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';

export const CustomerReportModal = ({
    isOpen,
    onClose,
    site,
    serviceData,
    rollerData,
    specData
}) => {
    const reportContentRef = useRef(null);
    
    if (!isOpen || !site) return null;

    const handlePrint = async () => {
        // Trigger print styles and allow CSS to apply
        window.dispatchEvent(new Event('beforeprint'));
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (window.electronAPI && window.electronAPI.printToPDF) {
            const result = await window.electronAPI.printToPDF();
            if (result.success) {
                console.log('PDF saved to:', result.path);
            } else if (!result.canceled) {
                console.error('PDF generation failed:', result.error);
                alert('Failed to generate PDF. Please try again.');
            }
        } else {
            // Fallback to browser print if not in Electron
            window.print();
        }
        
        // Reset print styles
        window.dispatchEvent(new Event('afterprint'));
    };

    const handleExcelExport = () => {
        // Create workbook
        const wb = XLSX.utils.book_new();

        // Summary Sheet
        const summaryData = [
            ['Maintenance Report Summary'],
            ['Customer', site.customer],
            ['Site Name', site.name],
            ['Location', site.location],
            ['Generated Date', formatDate(new Date().toISOString())],
            [''],
            ['Total Assets', sortedService.length + sortedRoller.length],
            ['Critical Attention', [...sortedService, ...sortedRoller].filter(i => i.remaining < 0).length],
            ['Due < 30 Days', [...sortedService, ...sortedRoller].filter(i => i.remaining >= 0 && i.remaining < 30).length],
        ];
        
        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

        // Service & Calibration Sheet
        const serviceHeaders = ['Asset Name', 'Code', 'Last Service', 'Due Date', 'Status', 'Remaining Days'];
        const serviceRows = sortedService.map(item => [
            item.name,
            item.code,
            formatDate(item.lastCal),
            formatDate(item.dueDate),
            getStatusText(item.opStatus),
            item.remaining
        ]);
        
        const serviceWs = XLSX.utils.aoa_to_sheet([serviceHeaders, ...serviceRows]);
        XLSX.utils.book_append_sheet(wb, serviceWs, 'Service & Calibration');

        // Roller Data Sheet (if exists)
        if (sortedRoller.length > 0) {
            const rollerHeaders = ['Asset Name', 'Code', 'Last Service', 'Due Date', 'Status', 'Remaining Days'];
            const rollerRows = sortedRoller.map(item => [
                item.name,
                item.code,
                formatDate(item.lastCal),
                formatDate(item.dueDate),
                getStatusText(item.opStatus),
                item.remaining
            ]);
            
            const rollerWs = XLSX.utils.aoa_to_sheet([rollerHeaders, ...rollerRows]);
            XLSX.utils.book_append_sheet(wb, rollerWs, 'Roller Data');
        }

        // Generate filename and download
        const fileName = `maintenance-report-${site.customer}-${site.name}-${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    const handleWordExport = async () => {
        // Create document sections
        const docChildren = [];

        // Title Section
        docChildren.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: "MAINTENANCE REPORT",
                        bold: true,
                        size: 32,
                        color: "2E74B5"
                    })
                ],
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 }
            })
        );

        // Site Information Section
        docChildren.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: "Site Information",
                        bold: true,
                        size: 24,
                        color: "4F81BD"
                    })
                ],
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 }
            })
        );

        // Site Details Table
        const siteTable = new Table({
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph("Customer")], width: { size: 30, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph(site.customer)], width: { size: 70, type: WidthType.PERCENTAGE } })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph("Site Name")], width: { size: 30, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph(site.name)], width: { size: 70, type: WidthType.PERCENTAGE } })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph("Location")], width: { size: 30, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph(site.location)], width: { size: 70, type: WidthType.PERCENTAGE } })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph("Generated Date")], width: { size: 30, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph(formatDate(new Date().toISOString()))], width: { size: 70, type: WidthType.PERCENTAGE } })
                    ]
                })
            ],
            width: { size: 100, type: WidthType.PERCENTAGE }
        });
        docChildren.push(siteTable);

        // Executive Summary Section
        const criticalCount = [...sortedService, ...sortedRoller].filter(i => i.remaining < 0).length;
        const dueSoonCount = [...sortedService, ...sortedRoller].filter(i => i.remaining >= 0 && i.remaining < 30).length;

        docChildren.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: "Executive Summary",
                        bold: true,
                        size: 24,
                        color: "4F81BD"
                    })
                ],
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 }
            })
        );

        const summaryTable = new Table({
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph("Total Assets")], width: { size: 50, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph(String(sortedService.length + sortedRoller.length))], width: { size: 50, type: WidthType.PERCENTAGE } })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph("Critical Attention Required")], width: { size: 50, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph(String(criticalCount))], width: { size: 50, type: WidthType.PERCENTAGE } })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph("Due < 30 Days")], width: { size: 50, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph(String(dueSoonCount))], width: { size: 50, type: WidthType.PERCENTAGE } })
                    ]
                })
            ],
            width: { size: 100, type: WidthType.PERCENTAGE }
        });
        docChildren.push(summaryTable);

        // Service & Calibration Section
        if (sortedService.length > 0) {
            docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Service & Calibration Schedule",
                            bold: true,
                            size: 24,
                            color: "4F81BD"
                        })
                    ],
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                })
            );

            // Service Table Header
            const serviceTableRows = [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ text: "Asset Name", bold: true })], width: { size: 25, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph({ text: "Code", bold: true })], width: { size: 15, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph({ text: "Last Service", bold: true })], width: { size: 20, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph({ text: "Due Date", bold: true })], width: { size: 20, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph({ text: "Status", bold: true })], width: { size: 20, type: WidthType.PERCENTAGE } })
                    ]
                })
            ];

            // Service Data Rows
            sortedService.forEach(item => {
                const statusColor = item.opStatus === 'Down' ? 'FF0000' : item.opStatus === 'Warning' ? 'FFA500' : '008000';
                serviceTableRows.push(
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph(item.name)], width: { size: 25, type: WidthType.PERCENTAGE } }),
                            new TableCell({ children: [new Paragraph(item.code)], width: { size: 15, type: WidthType.PERCENTAGE } }),
                            new TableCell({ children: [new Paragraph(formatDate(item.lastCal))], width: { size: 20, type: WidthType.PERCENTAGE } }),
                            new TableCell({ children: [new Paragraph(formatDate(item.dueDate))], width: { size: 20, type: WidthType.PERCENTAGE } }),
                            new TableCell({ children: [new Paragraph({ text: getStatusText(item.opStatus), color: statusColor })], width: { size: 20, type: WidthType.PERCENTAGE } })
                        ]
                    })
                );
            });

            const serviceTable = new Table({
                rows: serviceTableRows,
                width: { size: 100, type: WidthType.PERCENTAGE }
            });
            docChildren.push(serviceTable);
        }

        // Roller Data Section
        if (sortedRoller.length > 0) {
            docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Roller Data Schedule",
                            bold: true,
                            size: 24,
                            color: "4F81BD"
                        })
                    ],
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                })
            );

            // Roller Table Header
            const rollerTableRows = [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ text: "Asset Name", bold: true })], width: { size: 25, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph({ text: "Code", bold: true })], width: { size: 15, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph({ text: "Last Service", bold: true })], width: { size: 20, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph({ text: "Due Date", bold: true })], width: { size: 20, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph({ text: "Status", bold: true })], width: { size: 20, type: WidthType.PERCENTAGE } })
                    ]
                })
            ];

            // Roller Data Rows
            sortedRoller.forEach(item => {
                const statusColor = item.opStatus === 'Down' ? 'FF0000' : item.opStatus === 'Warning' ? 'FFA500' : '008000';
                rollerTableRows.push(
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph(item.name)], width: { size: 25, type: WidthType.PERCENTAGE } }),
                            new TableCell({ children: [new Paragraph(item.code)], width: { size: 15, type: WidthType.PERCENTAGE } }),
                            new TableCell({ children: [new Paragraph(formatDate(item.lastCal))], width: { size: 20, type: WidthType.PERCENTAGE } }),
                            new TableCell({ children: [new Paragraph(formatDate(item.dueDate))], width: { size: 20, type: WidthType.PERCENTAGE } }),
                            new TableCell({ children: [new Paragraph({ text: getStatusText(item.opStatus), color: statusColor })], width: { size: 20, type: WidthType.PERCENTAGE } })
                        ]
                    })
                );
            });

            const rollerTable = new Table({
                rows: rollerTableRows,
                width: { size: 100, type: WidthType.PERCENTAGE }
            });
            docChildren.push(rollerTable);
        }

        // Footer Section
        docChildren.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: "Generated by Accurate Industries Maintenance System",
                        italics: true,
                        size: 20,
                        color: "666666"
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 600 }
            })
        );

        // Create document
        const doc = new Document({
            sections: [{
                children: docChildren
            }]
        });

        // Generate and download
        const buffer = await Packer.toBuffer(doc);
        const fileName = `maintenance-report-${site.customer}-${site.name}-${new Date().toISOString().split('T')[0]}.docx`;
        saveAs(new Blob([buffer]), fileName);
    };

    const handleImageExport = async () => {
        if (!reportContentRef.current) {
            alert('Unable to capture report content. Please try again.');
            return;
        }

        // Store original button state outside try-catch
        const originalButton = event.target;
        const originalText = originalButton.innerHTML;

        try {
            // Show loading state
            originalButton.innerHTML = '<span class="animate-spin">⏳</span> Capturing...';
            originalButton.disabled = true;

            // Hide the modal header temporarily for clean capture
            const modalHeader = reportContentRef.current.querySelector('.print\\:hidden');
            if (modalHeader) {
                modalHeader.style.display = 'none';
            }

            // Apply print styles for capture
            window.dispatchEvent(new Event('beforeprint'));
            await new Promise(resolve => setTimeout(resolve, 300));

            // Capture the report content
            const canvas = await html2canvas(reportContentRef.current.querySelector('.print-content-inner'), {
                backgroundColor: '#ffffff',
                scale: 2, // Higher resolution
                useCORS: true,
                allowTaint: true,
                width: reportContentRef.current.querySelector('.print-content-inner').scrollWidth,
                height: reportContentRef.current.querySelector('.print-content-inner').scrollHeight,
                scrollX: 0,
                scrollY: 0
            });

            // Reset styles
            window.dispatchEvent(new Event('afterprint'));
            if (modalHeader) {
                modalHeader.style.display = '';
            }

            // Convert to blob and download
            canvas.toBlob((blob) => {
                const fileName = `maintenance-report-${site.customer}-${site.name}-${new Date().toISOString().split('T')[0]}.png`;
                saveAs(blob, fileName);
                
                // Reset button
                originalButton.innerHTML = originalText;
                originalButton.disabled = false;
            }, 'image/png', 0.95);

        } catch (error) {
            console.error('Image export failed:', error);
            alert('Failed to capture image. Please try again.');
            
            // Reset button on error
            originalButton.innerHTML = originalText;
            originalButton.disabled = false;
        }
    };

    // Helper to sort by Due Date (most urgent first)
    const sortByDue = (a, b) => {
        if (a.remaining < b.remaining) return -1;
        if (a.remaining > b.remaining) return 1;
        return 0;
    };

    const sortedService = [...serviceData].filter(a => a.active !== false).sort(sortByDue);
    const sortedRoller = [...rollerData].filter(a => a.active !== false).sort(sortByDue);

    // Helper for operational status text
    const getStatusText = (opStatus) => {
        if (opStatus === 'Down') return 'DOWN/CRITICAL';
        if (opStatus === 'Warning') return 'WARNING';
        return 'OPERATIONAL';
    };

    // Helper for operational status color (print friendly borders)
    const getStatusStyle = (opStatus) => {
        if (opStatus === 'Down') return 'border-l-4 border-red-600 bg-red-50 text-red-900';
        if (opStatus === 'Warning') return 'border-l-4 border-amber-500 bg-amber-50 text-amber-900';
        return 'border-l-4 border-green-600 text-slate-100 print:text-black';
    };

    return (
        <div ref={reportContentRef} className="print-content fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:p-0 print:bg-white print:absolute print:inset-0 print:z-[9999]">

            {/* --- PREVIEW CONTAINER (Screen Mode) --- */}
            <div className="print-content-inner bg-slate-800 w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col print:h-auto print:shadow-none print:rounded-none print:w-full print:max-w-none print:bg-white">

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
                        <button onClick={handleWordExport} className="bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                            <Icons.FileText size={18} /> Export Word
                        </button>
                        <button onClick={handleImageExport} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                            <Icons.Camera size={18} /> Export Image
                        </button>
                        <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                            <Icons.Printer size={18} /> Print to PDF
                        </button>
                        <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-slate-300 print:text-black px-4 py-2 rounded-lg font-bold transition-colors">
                            Close
                        </button>
                    </div>
                </div>

                {/* --- DOCUMENT CONTENT --- */}
                <div className="flex-1 overflow-auto p-8 print:p-0 print:overflow-visible bg-slate-800 text-slate-100 print:text-black font-sans print:bg-white print:text-black">
                    <div className="max-w-4xl mx-auto print:max-w-none print:mx-0">

                        {/* DOCUMENT HEADER */}
                        <header className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end print:border-b-2 print:border-gray-300">
                            <div>
                                <h1 className="text-3xl font-black uppercase tracking-wider text-slate-100 print:text-black mb-1 print:text-black">Maintenance Report</h1>
                                <div className="text-slate-400 print:text-black font-medium print:text-black">{site.customer} | {site.name}</div>
                                <div className="text-sm text-slate-400 print:text-black mt-1 print:text-black">
                                    <span className="print:hidden"><Icons.MapPin size={12} className="inline mr-1" /></span>
                                    <span className="hidden print:inline">📍 </span>
                                    {site.location}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-slate-400 print:text-black uppercase print:text-black">Generated</div>
                                <div className="text-xl font-bold text-slate-100 print:text-black print:text-black">{formatDate(new Date().toISOString())}</div>
                                <div className="mt-2 font-bold text-blue-600 text-sm">ACCURATE INDUSTRIES</div>
                            </div>
                        </header>

                        {/* EXECUTIVE SUMMARY */}
                        <section className="mb-8 grid grid-cols-3 gap-4 print:gap-6">
                            <div className="p-4 border border-slate-700 rounded bg-slate-900 print:border-slate-600 print:bg-white print:border-gray-300">
                                <div className="text-xs font-bold text-slate-400 print:text-black uppercase print:text-black">Total Assets</div>
                                <div className="text-2xl font-bold text-slate-100 print:text-black print:text-black">{sortedService.length + sortedRoller.length}</div>
                            </div>
                            <div className="p-4 border border-slate-700 rounded bg-slate-900 print:border-slate-600 print:bg-white print:border-gray-300">
                                <div className="text-xs font-bold text-slate-400 print:text-black uppercase print:text-black">Critical Attention</div>
                                <div className="text-2xl font-bold text-red-600">
                                    {[...sortedService, ...sortedRoller].filter(i => i.remaining < 0).length}
                                </div>
                            </div>
                            <div className="p-4 border border-slate-700 rounded bg-slate-900 print:border-slate-600 print:bg-white print:border-gray-300">
                                <div className="text-xs font-bold text-slate-400 print:text-black uppercase print:text-black">Due &lt; 30 Days</div>
                                <div className="text-2xl font-bold text-amber-600">
                                    {[...sortedService, ...sortedRoller].filter(i => i.remaining >= 0 && i.remaining < 30).length}
                                </div>
                            </div>
                        </section>

                        {/* SECTION 1: SERVICE SCHEDULE */}
                        <section className="mb-10 break-inside-avoid">
                            <h2 className="text-xl font-bold text-slate-200 print:text-black border-b border-slate-600 pb-2 mb-4 flex items-center gap-2 print:text-black print:border-b print:border-gray-300">
                                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded uppercase">Schedule</span>
                                Service & Calibration
                            </h2>
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-400 text-slate-400 print:text-black uppercase text-xs tracking-wider print:border-b print:border-gray-300 print:text-black">
                                        <th className="py-2 font-bold">Asset Name</th>
                                        <th className="py-2 font-bold">Code</th>
                                        <th className="py-2 font-bold">Last Service</th>
                                        <th className="py-2 font-bold">Due Date</th>
                                        <th className="py-2 font-bold text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 print:divide-y print:divide-gray-300">
                                    {sortedService.map((item) => (
                                        <React.Fragment key={item.id}>
                                            <tr className={`break-inside-avoid ${getStatusStyle(item.opStatus).replace('border-l-4', 'border-l-0')} print:border-b print:border-slate-100`}>
                                                <td className="py-3 font-semibold text-slate-100 print:text-black">{item.name}</td>
                                                <td className="py-3 font-mono text-slate-400 print:text-black text-xs">{item.code}</td>
                                                <td className="py-3 text-slate-400 print:text-black">{formatDate(item.lastCal)}</td>
                                                <td className="py-3 text-slate-100 print:text-black font-medium">{formatDate(item.dueDate)}</td>
                                                <td className="py-3 text-right">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold border ${item.opStatus === 'Down' ? 'border-red-200 bg-red-100 text-red-800' :
                                                        item.opStatus === 'Warning' ? 'border-amber-200 bg-amber-100 text-amber-800' :
                                                            'border-green-200 bg-green-100 text-green-800'
                                                        }`}>
                                                        {getStatusText(item.opStatus)}
                                                    </span>
                                                </td>
                                            </tr>
                                            {(item.opStatus === 'Warning' || item.opStatus === 'Down') && item.opNote && (
                                                <tr className="break-inside-avoid bg-slate-900 print:bg-white">
                                                    <td colSpan={5} className="py-2 px-4 text-xs italic text-slate-400 print:text-black border-l-4 border-slate-600">
                                                        <strong className="font-bold text-slate-300 print:text-black not-italic">Note:</strong> {item.opNote}
                                                        {item.opNoteTimestamp && (
                                                            <span className="ml-2 text-slate-400 print:text-black">({formatDate(item.opNoteTimestamp, true)})</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        <div className="hidden print:block print:h-4"></div>

                        {/* SECTION 2: ROLLER SCHEDULE */}
                        <section className="mb-10 break-inside-avoid">
                            <h2 className="text-xl font-bold text-slate-200 print:text-black border-b border-slate-600 pb-2 mb-4 flex items-center gap-2">
                                <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded uppercase">Maintenance</span>
                                Roller Replacement
                            </h2>
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-400 text-slate-400 print:text-black uppercase text-xs tracking-wider">
                                        <th className="py-2 font-bold">Asset Name</th>
                                        <th className="py-2 font-bold">Code</th>
                                        <th className="py-2 font-bold">Last Replaced</th>
                                        <th className="py-2 font-bold">Due Date</th>
                                        <th className="py-2 font-bold text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 print:divide-y print:divide-gray-300">
                                    {sortedRoller.map((item) => (
                                        <React.Fragment key={item.id}>
                                            <tr className="break-inside-avoid">
                                                <td className="py-3 font-semibold text-slate-100 print:text-black">{item.name}</td>
                                                <td className="py-3 font-mono text-slate-400 print:text-black text-xs">{item.code}</td>
                                                <td className="py-3 text-slate-400 print:text-black">{formatDate(item.lastCal)}</td>
                                                <td className="py-3 text-slate-100 print:text-black font-medium">{formatDate(item.dueDate)}</td>
                                                <td className="py-3 text-right">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold border ${item.opStatus === 'Down' ? 'border-red-200 bg-red-100 text-red-800' :
                                                        item.opStatus === 'Warning' ? 'border-amber-200 bg-amber-100 text-amber-800' :
                                                            'border-green-200 bg-green-100 text-green-800'
                                                        }`}>
                                                        {getStatusText(item.opStatus)}
                                                    </span>
                                                </td>
                                            </tr>
                                            {(item.opStatus === 'Warning' || item.opStatus === 'Down') && item.opNote && (
                                                <tr className="break-inside-avoid bg-slate-900 print:bg-white">
                                                    <td colSpan={5} className="py-2 px-4 text-xs italic text-slate-400 print:text-black border-l-4 border-slate-600">
                                                        <strong className="font-bold text-slate-300 print:text-black not-italic">Note:</strong> {item.opNote}
                                                        {item.opNoteTimestamp && (
                                                            <span className="ml-2 text-slate-400 print:text-black">({formatDate(item.opNoteTimestamp, true)})</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        <div className="hidden print:block page-break-before-always" style={{ pageBreakBefore: 'always' }}></div>

                        {/* SECTION 3: EQUIPMENT SPECS */}
                        <section className="break-inside-avoid">
                            <h2 className="text-xl font-bold text-slate-200 print:text-black border-b border-slate-600 pb-2 mb-4 flex items-center gap-2">
                                <span className="bg-slate-700 text-white text-xs px-2 py-1 rounded uppercase">Configuration</span>
                                Equipment Specifications
                            </h2>
                            <div className="grid grid-cols-1 gap-4">
                                {specData.map((spec, idx) => (
                                    <div key={idx} className="border border-slate-700 rounded p-4 bg-slate-900 break-inside-avoid flex flex-col gap-2 print:border-slate-600 print:bg-white print:border-gray-300">
                                        <div className="flex justify-between border-b border-slate-700 pb-2 mb-1">
                                            <span className="font-bold text-slate-100 print:text-black">{spec.description || 'Unknown Asset'}</span>
                                            <span className="font-mono text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 print:text-black">{spec.weigher}</span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                            <div>
                                                <span className="block text-slate-400 print:text-black uppercase font-bold text-[10px]">Scale Type</span>
                                                <span className="font-medium text-slate-200 print:text-black">{spec.scaleType || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 print:text-black uppercase font-bold text-[10px]">Integrator</span>
                                                <span className="font-medium text-slate-200 print:text-black">{spec.integratorController || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 print:text-black uppercase font-bold text-[10px]">Speed Sensor</span>
                                                <span className="font-medium text-slate-200 print:text-black">{spec.speedSensorType || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 print:text-black uppercase font-bold text-[10px]">Load Cell</span>
                                                <span className="font-medium text-slate-200 print:text-black">{spec.loadCellBrand || '-'} ({spec.numberOfLoadCells || '0'}x)</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 print:text-black uppercase font-bold text-[10px]">LC Specs</span>
                                                <span className="font-medium text-slate-200 print:text-black">{spec.loadCellSize || '-'} / {spec.loadCellSensitivity || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 print:text-black uppercase font-bold text-[10px]">Roller Dims</span>
                                                <span className="font-medium text-slate-200 print:text-black">{spec.rollDims || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 print:text-black uppercase font-bold text-[10px]">Billet</span>
                                                <span className="font-medium text-slate-200 print:text-black">{spec.billetWeightType || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 print:text-black uppercase font-bold text-[10px]">Billet Size</span>
                                                <span className="font-medium text-slate-200 print:text-black">{spec.billetWeightSize || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <footer className="mt-12 pt-4 border-t border-slate-700 text-center text-xs text-slate-400 print:text-black">
                            Generated by Maintenance Tracker App
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    );
};
