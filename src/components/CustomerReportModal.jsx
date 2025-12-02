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

    // Helper for status text
    const getStatusText = (days) => {
        if (days < 0) return 'OVERDUE';
        if (days < 30) return 'DUE SOON';
        return 'OK';
    };

    // Helper for status color (print friendly borders)
    const getStatusStyle = (days) => {
        if (days < 0) return 'border-l-4 border-red-600 bg-red-50 text-red-900';
        if (days < 30) return 'border-l-4 border-amber-500 bg-amber-50 text-amber-900';
        return 'border-l-4 border-green-600 text-slate-900';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:p-0 print:bg-white print:absolute print:inset-0 print:z-[9999]">

            {/* --- PREVIEW CONTAINER (Screen Mode) --- */}
            <div className="bg-white w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col print:h-auto print:shadow-none print:rounded-none print:w-full print:max-w-none">

                {/* --- MODAL HEADER (Hidden on Print) --- */}
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 print:hidden">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Report Preview</h3>
                        <p className="text-sm text-slate-500">Review the layout before printing.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                            <Icons.Printer size={18} /> Print to PDF
                        </button>
                        <button onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold transition-colors">
                            Close
                        </button>
                    </div>
                </div>

                {/* --- DOCUMENT CONTENT --- */}
                <div className="flex-1 overflow-auto p-8 print:p-0 print:overflow-visible bg-white text-slate-900 font-sans">
                    <div className="max-w-4xl mx-auto print:max-w-none print:mx-0">

                        {/* DOCUMENT HEADER */}
                        <header className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
                            <div>
                                <h1 className="text-3xl font-black uppercase tracking-wider text-slate-900 mb-1">Maintenance Report</h1>
                                <div className="text-slate-500 font-medium">{site.customer} | {site.name}</div>
                                <div className="text-sm text-slate-400 mt-1"><Icons.MapPin size={12} className="inline mr-1" />{site.location}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-slate-400 uppercase">Generated</div>
                                <div className="text-xl font-bold text-slate-900">{formatDate(new Date().toISOString())}</div>
                                <div className="mt-2 font-bold text-blue-600 text-sm">ACCURATE INDUSTRIES</div>
                            </div>
                        </header>

                        {/* EXECUTIVE SUMMARY */}
                        <section className="mb-8 grid grid-cols-3 gap-4 print:gap-6">
                            <div className="p-4 border border-slate-200 rounded bg-slate-50 print:border-slate-300">
                                <div className="text-xs font-bold text-slate-500 uppercase">Total Assets</div>
                                <div className="text-2xl font-bold text-slate-900">{sortedService.length + sortedRoller.length}</div>
                            </div>
                            <div className="p-4 border border-slate-200 rounded bg-slate-50 print:border-slate-300">
                                <div className="text-xs font-bold text-slate-500 uppercase">Critical Attention</div>
                                <div className="text-2xl font-bold text-red-600">
                                    {[...sortedService, ...sortedRoller].filter(i => i.remaining < 0).length}
                                </div>
                            </div>
                            <div className="p-4 border border-slate-200 rounded bg-slate-50 print:border-slate-300">
                                <div className="text-xs font-bold text-slate-500 uppercase">Due &lt; 30 Days</div>
                                <div className="text-2xl font-bold text-amber-600">
                                    {[...sortedService, ...sortedRoller].filter(i => i.remaining >= 0 && i.remaining < 30).length}
                                </div>
                            </div>
                        </section>

                        {/* SECTION 1: SERVICE SCHEDULE */}
                        <section className="mb-10 break-inside-avoid">
                            <h2 className="text-xl font-bold text-slate-800 border-b border-slate-300 pb-2 mb-4 flex items-center gap-2">
                                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded uppercase">Schedule</span>
                                Service & Calibration
                            </h2>
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-400 text-slate-500 uppercase text-xs tracking-wider">
                                        <th className="py-2 font-bold">Asset Name</th>
                                        <th className="py-2 font-bold">Code</th>
                                        <th className="py-2 font-bold">Last Service</th>
                                        <th className="py-2 font-bold">Due Date</th>
                                        <th className="py-2 font-bold text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {sortedService.map((item) => (
                                        <tr key={item.id} className={`break-inside-avoid ${getStatusStyle(item.remaining).replace('border-l-4', 'border-l-0')} print:border-b print:border-slate-100`}>
                                            <td className="py-3 font-semibold text-slate-900">{item.name}</td>
                                            <td className="py-3 font-mono text-slate-600 text-xs">{item.code}</td>
                                            <td className="py-3 text-slate-600">{formatDate(item.lastCal)}</td>
                                            <td className="py-3 text-slate-900 font-medium">{formatDate(item.dueDate)}</td>
                                            <td className="py-3 text-right">
                                                <span className={`px-2 py-1 rounded text-xs font-bold border ${item.remaining < 0 ? 'border-red-200 bg-red-100 text-red-800' :
                                                        item.remaining < 30 ? 'border-amber-200 bg-amber-100 text-amber-800' :
                                                            'border-slate-200 bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {getStatusText(item.remaining)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        <div className="hidden print:block print:h-4"></div>

                        {/* SECTION 2: ROLLER SCHEDULE */}
                        <section className="mb-10 break-inside-avoid">
                            <h2 className="text-xl font-bold text-slate-800 border-b border-slate-300 pb-2 mb-4 flex items-center gap-2">
                                <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded uppercase">Maintenance</span>
                                Roller Replacement
                            </h2>
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-400 text-slate-500 uppercase text-xs tracking-wider">
                                        <th className="py-2 font-bold">Asset Name</th>
                                        <th className="py-2 font-bold">Code</th>
                                        <th className="py-2 font-bold">Last Replaced</th>
                                        <th className="py-2 font-bold">Due Date</th>
                                        <th className="py-2 font-bold text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {sortedRoller.map((item) => (
                                        <tr key={item.id} className="break-inside-avoid">
                                            <td className="py-3 font-semibold text-slate-900">{item.name}</td>
                                            <td className="py-3 font-mono text-slate-600 text-xs">{item.code}</td>
                                            <td className="py-3 text-slate-600">{formatDate(item.lastCal)}</td>
                                            <td className="py-3 text-slate-900 font-medium">{formatDate(item.dueDate)}</td>
                                            <td className="py-3 text-right">
                                                <span className={`px-2 py-1 rounded text-xs font-bold border ${item.remaining < 0 ? 'border-red-200 bg-red-100 text-red-800' :
                                                        item.remaining < 30 ? 'border-amber-200 bg-amber-100 text-amber-800' :
                                                            'border-slate-200 bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {getStatusText(item.remaining)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        <div className="hidden print:block page-break-before-always" style={{ pageBreakBefore: 'always' }}></div>

                        {/* SECTION 3: EQUIPMENT SPECS */}
                        <section className="break-inside-avoid">
                            <h2 className="text-xl font-bold text-slate-800 border-b border-slate-300 pb-2 mb-4 flex items-center gap-2">
                                <span className="bg-slate-700 text-white text-xs px-2 py-1 rounded uppercase">Configuration</span>
                                Equipment Specifications
                            </h2>
                            <div className="grid grid-cols-1 gap-4">
                                {specData.map((spec, idx) => (
                                    <div key={idx} className="border border-slate-200 rounded p-4 bg-slate-50 break-inside-avoid flex flex-col gap-2 print:border-slate-300">
                                        <div className="flex justify-between border-b border-slate-200 pb-2 mb-1">
                                            <span className="font-bold text-slate-900">{spec.description || 'Unknown Asset'}</span>
                                            <span className="font-mono text-xs bg-slate-200 px-2 py-1 rounded text-slate-700">{spec.weigher}</span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                            <div>
                                                <span className="block text-slate-400 uppercase font-bold text-[10px]">Scale</span>
                                                <span className="font-medium text-slate-800">{spec.scale || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 uppercase font-bold text-[10px]">Integrator</span>
                                                <span className="font-medium text-slate-800">{spec.integrator || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 uppercase font-bold text-[10px]">Speed Sensor</span>
                                                <span className="font-medium text-slate-800">{spec.speedSensor || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 uppercase font-bold text-[10px]">Load Cell</span>
                                                <span className="font-medium text-slate-800">{spec.loadCell || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 uppercase font-bold text-[10px]">Roller Dims</span>
                                                <span className="font-medium text-slate-800">{spec.rollDims || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 uppercase font-bold text-[10px]">Billet</span>
                                                <span className="font-medium text-slate-800">{spec.billetType || '-'} ({spec.billetWeight}kg)</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <footer className="mt-12 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
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
