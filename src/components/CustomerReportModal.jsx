import React, { useRef } from 'react';
import { Modal, Button } from './UIComponents';
import { Icons } from '../constants/icons.jsx';
import { formatDate } from '../utils/helpers';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const CustomerReportModal = ({
    isOpen,
    onClose,
    site,
    serviceData,
    rollerData
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

            // Create PDF from the report content
            const element = reportContentRef.current;
            if (!element) {
                throw new Error('Report content not found');
            }

            // Generate canvas from the element
            const canvas = await html2canvas(element, {
                scale: 2, // High resolution
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: element.scrollWidth, // Capture full width
                height: element.scrollHeight, // Capture full height
                windowWidth: document.documentElement.offsetWidth, // Prevent scroll clipping
                windowHeight: document.documentElement.offsetHeight
            });

            // Create PDF
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Calculate dimensions to fit the page
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;

            // FIX: Removed the * 200 multiplier that was exploding the image size
            // This calculates the scale factor to fit the image within A4 bounds
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            
            const centeredWidth = imgWidth * ratio;
            const centeredHeight = imgHeight * ratio;

            const imgX = (pdfWidth - centeredWidth) / 2;
            const imgY = 10; // 10mm top margin

            // Add image to PDF
            pdf.addImage(imgData, 'PNG', imgX, imgY, centeredWidth, centeredHeight);

            // Generate filename and download
            const fileName = `maintenance-report-${site.customer}-${site.name}-${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(fileName);

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

            // Reset modal header
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

    // Helper for operational status text
    const getStatusText = (opStatus) => {
        if (opStatus === 'Down') return 'DOWN/CRITICAL';
        if (opStatus === 'Warning') return 'WARNING';
        return 'OPERATIONAL';
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
                        <section className="mb-8 grid grid-cols-3 gap-6">
                            <div className="p-4 border border-gray-300 rounded bg-white">
                                <div className="text-xs font-bold text-black uppercase">Total Assets</div>
                                <div className="text-2xl font-bold text-black">{sortedService.length + sortedRoller.length}</div>
                            </div>
                            <div className="p-4 border border-gray-300 rounded bg-white">
                                <div className="text-xs font-bold text-black uppercase">Critical Attention</div>
                                <div className="text-2xl font-bold text-red-600">
                                    {[...sortedService, ...sortedRoller].filter(i => i.remaining < 0).length}
                                </div>
                            </div>
                            <div className="p-4 border border-gray-300 rounded bg-white">
                                <div className="text-xs font-bold text-black uppercase">Due &lt; 30 Days</div>
                                <div className="text-2xl font-bold text-amber-600">
                                    {[...sortedService, ...sortedRoller].filter(i => i.remaining >= 0 && i.remaining < 30).length}
                                </div>
                            </div>
                        </section>

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
                                        <th className="py-2 font-bold text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-300">
                                    {sortedService.map((item) => (
                                        <tr key={item.id} className="border-b border-gray-200">
                                            <td className="py-3 font-semibold text-black">{item.name}</td>
                                            <td className="py-3 font-mono text-black text-xs">{item.code}</td>
                                            <td className="py-3 text-black">{formatDate(item.lastCal)}</td>
                                            <td className="py-3 text-black font-medium">{formatDate(item.dueDate)}</td>
                                            <td className="py-3 text-right">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    item.remaining < 0 ? 'bg-red-100 text-red-800' :
                                                    item.remaining < 30 ? 'bg-amber-100 text-amber-800' :
                                                    'bg-green-100 text-green-800'
                                                }`}>
                                                    {getStatusText(item.opStatus)}
                                                </span>
                                            </td>
                                        </tr>
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
                                            <th className="py-2 font-bold text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-300">
                                        {sortedRoller.map((item) => (
                                            <tr key={item.id} className="border-b border-gray-200">
                                                <td className="py-3 font-semibold text-black">{item.name}</td>
                                                <td className="py-3 font-mono text-black text-xs">{item.code}</td>
                                                <td className="py-3 text-black">{formatDate(item.lastCal)}</td>
                                                <td className="py-3 text-black font-medium">{formatDate(item.dueDate)}</td>
                                                <td className="py-3 text-right">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                        item.remaining < 0 ? 'bg-red-100 text-red-800' :
                                                        item.remaining < 30 ? 'bg-amber-100 text-amber-800' :
                                                        'bg-green-100 text-green-800'
                                                    }`}>
                                                        {getStatusText(item.opStatus)}
                                                    </span>
                                                </td>
                                            </tr>
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
