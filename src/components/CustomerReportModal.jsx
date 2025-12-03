import React from 'react';
import { Icons, formatDate } from './UIComponents';

export const CustomerReportModal = ({
    isOpen,
    onClose,
    site,
    serviceData,
    rollerData,
    specData
}) => {
    if (!isOpen || !site) return null;

    const handlePrint = () => {
        window.print();
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
        return 'border-l-4 border-green-600 text-slate-100';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:p-0 print:bg-slate-800 print:absolute print:inset-0 print:z-[9999]">

            {/* --- PREVIEW CONTAINER (Screen Mode) --- */}
            <div className="bg-slate-800 w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col print:h-auto print:shadow-none print:rounded-none print:w-full print:max-w-none">

                {/* --- MODAL HEADER (Hidden on Print) --- */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900 print:hidden">
                    <div>
                        <h3 className="font-bold text-lg text-slate-200">Report Preview</h3>
                        <p className="text-sm text-slate-400">Review the layout before printing.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                            <Icons.Printer size={18} /> Print to PDF
                        </button>
                        <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-lg font-bold transition-colors">
                            Close
                        </button>
                    </div>
                </div>

                {/* --- DOCUMENT CONTENT --- */}
                <div className="flex-1 overflow-auto p-8 print:p-0 print:overflow-visible bg-slate-800 text-slate-100 font-sans">
                    <div className="max-w-4xl mx-auto print:max-w-none print:mx-0">

                        {/* DOCUMENT HEADER */}
                        <header className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
                            <div>
                                <h1 className="text-3xl font-black uppercase tracking-wider text-slate-100 mb-1">Maintenance Report</h1>
                                <div className="text-slate-400 font-medium">{site.customer} | {site.name}</div>
                                <div className="text-sm text-slate-400 mt-1"><Icons.MapPin size={12} className="inline mr-1" />{site.location}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-slate-400 uppercase">Generated</div>
                                <div className="text-xl font-bold text-slate-100">{formatDate(new Date().toISOString())}</div>
                                <div className="mt-2 font-bold text-blue-600 text-sm">ACCURATE INDUSTRIES</div>
                            </div>
                        </header>

                        {/* EXECUTIVE SUMMARY */}
                        <section className="mb-8 grid grid-cols-3 gap-4 print:gap-6">
                            <div className="p-4 border border-slate-700 rounded bg-slate-900 print:border-slate-600">
                                <div className="text-xs font-bold text-slate-400 uppercase">Total Assets</div>
                                <div className="text-2xl font-bold text-slate-100">{sortedService.length + sortedRoller.length}</div>
                            </div>
                            <div className="p-4 border border-slate-700 rounded bg-slate-900 print:border-slate-600">
                                <div className="text-xs font-bold text-slate-400 uppercase">Critical Attention</div>
                                <div className="text-2xl font-bold text-red-600">
                                    {[...sortedService, ...sortedRoller].filter(i => i.remaining < 0).length}
                                </div>
                            </div>
                            <div className="p-4 border border-slate-700 rounded bg-slate-900 print:border-slate-600">
                                <div className="text-xs font-bold text-slate-400 uppercase">Due &lt; 30 Days</div>
                                <div className="text-2xl font-bold text-amber-600">
                                    {[...sortedService, ...sortedRoller].filter(i => i.remaining >= 0 && i.remaining < 30).length}
                                </div>
                            </div>
                        </section>

                        {/* SECTION 1: SERVICE SCHEDULE */}
                        <section className="mb-10 break-inside-avoid">
                            <h2 className="text-xl font-bold text-slate-200 border-b border-slate-600 pb-2 mb-4 flex items-center gap-2">
                                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded uppercase">Schedule</span>
                                Service & Calibration
                            </h2>
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-400 text-slate-400 uppercase text-xs tracking-wider">
                                        <th className="py-2 font-bold">Asset Name</th>
                                        <th className="py-2 font-bold">Code</th>
                                        <th className="py-2 font-bold">Last Service</th>
                                        <th className="py-2 font-bold">Due Date</th>
                                        <th className="py-2 font-bold text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {sortedService.map((item) => (
                                        <React.Fragment key={item.id}>
                                            <tr className={`break-inside-avoid ${getStatusStyle(item.opStatus).replace('border-l-4', 'border-l-0')} print:border-b print:border-slate-100`}>
                                                <td className="py-3 font-semibold text-slate-100">{item.name}</td>
                                                <td className="py-3 font-mono text-slate-400 text-xs">{item.code}</td>
                                                <td className="py-3 text-slate-400">{formatDate(item.lastCal)}</td>
                                                <td className="py-3 text-slate-100 font-medium">{formatDate(item.dueDate)}</td>
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
                                                <tr className="break-inside-avoid bg-slate-900">
                                                    <td colSpan={5} className="py-2 px-4 text-xs italic text-slate-400 border-l-4 border-slate-600">
                                                        <strong className="font-bold text-slate-300 not-italic">Note:</strong> {item.opNote}
                                                        {item.opNoteTimestamp && (
                                                            <span className="ml-2 text-slate-400">({formatDate(item.opNoteTimestamp, true)})</span>
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
                            <h2 className="text-xl font-bold text-slate-200 border-b border-slate-600 pb-2 mb-4 flex items-center gap-2">
                                <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded uppercase">Maintenance</span>
                                Roller Replacement
                            </h2>
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-400 text-slate-400 uppercase text-xs tracking-wider">
                                        <th className="py-2 font-bold">Asset Name</th>
                                        <th className="py-2 font-bold">Code</th>
                                        <th className="py-2 font-bold">Last Replaced</th>
                                        <th className="py-2 font-bold">Due Date</th>
                                        <th className="py-2 font-bold text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {sortedRoller.map((item) => (
                                        <React.Fragment key={item.id}>
                                            <tr className="break-inside-avoid">
                                                <td className="py-3 font-semibold text-slate-100">{item.name}</td>
                                                <td className="py-3 font-mono text-slate-400 text-xs">{item.code}</td>
                                                <td className="py-3 text-slate-400">{formatDate(item.lastCal)}</td>
                                                <td className="py-3 text-slate-100 font-medium">{formatDate(item.dueDate)}</td>
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
                                                <tr className="break-inside-avoid bg-slate-900">
                                                    <td colSpan={5} className="py-2 px-4 text-xs italic text-slate-400 border-l-4 border-slate-600">
                                                        <strong className="font-bold text-slate-300 not-italic">Note:</strong> {item.opNote}
                                                        {item.opNoteTimestamp && (
                                                            <span className="ml-2 text-slate-400">({formatDate(item.opNoteTimestamp, true)})</span>
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
                            <h2 className="text-xl font-bold text-slate-200 border-b border-slate-600 pb-2 mb-4 flex items-center gap-2">
                                <span className="bg-slate-700 text-white text-xs px-2 py-1 rounded uppercase">Configuration</span>
                                Equipment Specifications
                            </h2>
                            <div className="grid grid-cols-1 gap-4">
                                {specData.map((spec, idx) => (
                                    <div key={idx} className="border border-slate-700 rounded p-4 bg-slate-900 break-inside-avoid flex flex-col gap-2 print:border-slate-600">
                                        <div className="flex justify-between border-b border-slate-700 pb-2 mb-1">
                                            <span className="font-bold text-slate-100">{spec.description || 'Unknown Asset'}</span>
                                            <span className="font-mono text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">{spec.weigher}</span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                            <div>
                                                <span className="block text-slate-400 uppercase font-bold text-[10px]">Scale Type</span>
                                                <span className="font-medium text-slate-200">{spec.scaleType || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 uppercase font-bold text-[10px]">Integrator</span>
                                                <span className="font-medium text-slate-200">{spec.integratorController || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 uppercase font-bold text-[10px]">Speed Sensor</span>
                                                <span className="font-medium text-slate-200">{spec.speedSensorType || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 uppercase font-bold text-[10px]">Load Cell</span>
                                                <span className="font-medium text-slate-200">{spec.loadCellBrand || '-'} ({spec.numberOfLoadCells || '0'}x)</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 uppercase font-bold text-[10px]">LC Specs</span>
                                                <span className="font-medium text-slate-200">{spec.loadCellSize || '-'} / {spec.loadCellSensitivity || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 uppercase font-bold text-[10px]">Roller Dims</span>
                                                <span className="font-medium text-slate-200">{spec.rollDims || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 uppercase font-bold text-[10px]">Billet</span>
                                                <span className="font-medium text-slate-200">{spec.billetWeightType || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 uppercase font-bold text-[10px]">Billet Size</span>
                                                <span className="font-medium text-slate-200">{spec.billetWeightSize || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <footer className="mt-12 pt-4 border-t border-slate-700 text-center text-xs text-slate-400">
                            Generated by Maintenance Tracker App
                        </footer>
                    </div>
                </div>
            </div>

            {/* CSS FOR PRINT HIDING */}
            <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #root {
            display: none;
          }
          .fixed.inset-0 {
            position: static !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: auto !important;
            visibility: visible !important;
            display: block !important;
          }
          .fixed.inset-0 * {
            visibility: visible;
          }
          .print\\:hidden {
             display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
        }
      `}</style>
        </div>
    );
};
