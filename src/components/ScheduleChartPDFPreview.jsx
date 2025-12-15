import React, { useRef } from 'react';
import { Modal } from './UIComponents';
import { Icons } from '../constants/icons.jsx';
import { formatDate } from '../utils/helpers';
import { saveAs } from 'file-saver';
import { pdf } from '@react-pdf/renderer';
import { ScheduleChartPDF } from './ScheduleChartPDF';
import { countUniqueAssets } from '../utils/assetUtils';

export const ScheduleChartPDFPreview = ({
  isOpen,
  onClose,
  site,
  generatedDate
}) => {
  const modalContainerRef = useRef(null);
  const reportContentRef = useRef(null);

  if (!isOpen || !site) return null;

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
        <ScheduleChartPDF
          site={site}
          generatedDate={generatedDate}
        />
      )).toBlob();

      // Generate filename and download
      const fileName = `schedule-chart-${site.customer}-${site.name}-${new Date().toISOString().split('T')[0]}.pdf`;
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

  // Sort data by due date
  const sortByDue = (a, b) => {
    if (a.remaining < 0 && b.remaining >= 0) return -1;
    if (a.remaining >= 0 && b.remaining < 0) return 1;
    if (a.remaining >= 0 && a.remaining < 30 && b.remaining >= 30) return -1;
    if (a.remaining >= 30 && b.remaining >= 0 && b.remaining < 30) return 1;
    return a.remaining - b.remaining;
  };

  const sortedService = [...(site.serviceData || [])].filter(a => a.active !== false).sort(sortByDue);
  const sortedRoller = [...(site.rollerData || [])].filter(a => a.active !== false).sort(sortByDue);

  // Calculate counts for health bar
  const allAssets = [...sortedService, ...sortedRoller];
  const criticalCount = allAssets.filter(i => i.remaining < 0).length;
  const warningCount = allAssets.filter(i => i.remaining >= 0 && i.remaining < 30).length;
  const healthyCount = allAssets.filter(i => i.remaining >= 30).length;

  return (
    <div ref={modalContainerRef} className="print-content fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:p-0 print:bg-white print:absolute print:inset-0 print:z-[9999]">
      {/* --- PREVIEW CONTAINER (Screen Mode) --- */}
      <div className="print-content-inner bg-slate-800 w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl overflow-auto flex flex-col print:h-auto print:shadow-none print:rounded-none print:w-full print:max-w-none print:bg-white">

        {/* --- MODAL HEADER (Hidden on Print) --- */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900 print:hidden">
          <div>
            <h3 className="font-bold text-lg text-slate-200 print:text-black">Schedule & Chart Preview</h3>
            <p className="text-sm text-slate-400 print:text-black">Review the layout before printing.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
              <Icons.Printer size={18} /> Print to PDF
            </button>
            <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-slate-300 print:text-black px-4 py-2 rounded-lg font-bold transition-colors">
              Close
            </button>
          </div>
        </div>

        {/* --- DOCUMENT CONTENT FOR PDF GENERATION --- */}
        <div ref={reportContentRef} className="bg-white text-black flex-1 overflow-auto">
          <div className="p-8">
            <div className="max-w-4xl mx-auto">

              {/* DOCUMENT HEADER */}
              <header className="border-b-2 border-gray-300 pb-6 mb-8">
                <h1 className="text-3xl font-black uppercase tracking-wider text-black mb-2">Schedule & Chart Report</h1>
                <div className="text-black font-medium text-lg">{site.customer} | {site.name}</div>
                <div className="text-sm text-black mt-1">
                  <span>📍 </span>
                  {site.location}
                </div>
                <div className="text-sm text-black mt-2">
                  Generated: {formatDate(new Date().toISOString())}
                </div>
              </header>

              {/* SCHEDULE SUMMARY */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-black border-b border-gray-300 pb-2 mb-4">Schedule Summary</h2>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="p-4 border border-gray-300 rounded bg-gray-50">
                    <div className="text-xs font-bold text-black uppercase">Total Assets</div>
                    <div className="text-2xl font-bold text-black">{countUniqueAssets(site.serviceData, site.rollerData)}</div>
                  </div>
                  <div className="p-4 border border-gray-300 rounded bg-red-50">
                    <div className="text-xs font-bold text-black uppercase">Overdue</div>
                    <div className="text-2xl font-bold text-red-600">
                      {[...sortedService, ...sortedRoller].filter(i => i.remaining < 0).length}
                    </div>
                  </div>
                  <div className="p-4 border border-gray-300 rounded bg-amber-50">
                    <div className="text-xs font-bold text-black uppercase">Due Soon</div>
                    <div className="text-2xl font-bold text-amber-600">
                      {[...sortedService, ...sortedRoller].filter(i => i.remaining >= 0 && i.remaining < 30).length}
                    </div>
                  </div>
                  <div className="p-4 border border-gray-300 rounded bg-green-50">
                    <div className="text-xs font-bold text-black uppercase">Operational</div>
                    <div className="text-2xl font-bold text-green-600">
                      {[...sortedService, ...sortedRoller].filter(i => i.remaining >= 30).length}
                    </div>
                  </div>
                </div>
              </section>

              {/* VISUAL HEALTH BAR */}
              <section className="mb-8">
                <div className="p-4 border border-gray-300 rounded bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase">Overall Health</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-xs text-red-600 font-medium">{Math.round((criticalCount / (sortedService.length + sortedRoller.length)) * 100)}%</span></div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div><span className="text-xs text-amber-600 font-medium">{Math.round((warningCount / (sortedService.length + sortedRoller.length)) * 100)}%</span></div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-xs text-green-600 font-medium">{Math.round((healthyCount / (sortedService.length + sortedRoller.length)) * 100)}%</span></div>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex">
                    <div className="bg-red-500 transition-all duration-500" style={{ width: `${(criticalCount / (sortedService.length + sortedRoller.length)) * 100}%` }}></div>
                    <div className="bg-amber-500 transition-all duration-500" style={{ width: `${(warningCount / (sortedService.length + sortedRoller.length)) * 100}%` }}></div>
                    <div className="bg-green-500 transition-all duration-500" style={{ width: `${(healthyCount / (sortedService.length + sortedRoller.length)) * 100}%` }}></div>
                  </div>
                </div>
              </section>

              {/* DETAILED SCHEDULE */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-black border-b border-gray-300 pb-2 mb-4">Detailed Schedule</h2>

                {/* Service Schedule */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-black mb-3">Service Equipment</h3>
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-300 text-black uppercase text-xs tracking-wider">
                        <th className="py-2 font-bold">Name</th>
                        <th className="py-2 font-bold">Code</th>
                        <th className="py-2 font-bold">Frequency</th>
                        <th className="py-2 font-bold">Last Service</th>
                        <th className="py-2 font-bold">Due Date</th>
                        <th className="py-2 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300">
                      {sortedService.map((item) => (
                        <tr key={item.id} className="border-b border-gray-200">
                          <td className="py-3 font-semibold text-black">{item.name}</td>
                          <td className="py-3 font-mono text-black text-xs">{item.code}</td>
                          <td className="py-3 text-black">{item.frequency || 'N/A'}</td>
                          <td className="py-3 text-black">{formatDate(item.lastCal)}</td>
                          <td className="py-3 text-black font-medium">{formatDate(item.dueDate)}</td>
                          <td className="py-3 text-black">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${item.remaining < 0 ? 'bg-red-100 text-red-800' :
                              item.remaining < 30 ? 'bg-amber-100 text-amber-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                              {item.remaining < 0 ? 'OVERDUE' :
                                item.remaining < 30 ? 'DUE SOON' :
                                  'OPERATIONAL'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Roller Schedule */}
                <div>
                  <h3 className="text-lg font-semibold text-black mb-3">Roller Equipment</h3>
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-300 text-black uppercase text-xs tracking-wider">
                        <th className="py-2 font-bold">Name</th>
                        <th className="py-2 font-bold">Code</th>
                        <th className="py-2 font-bold">Frequency</th>
                        <th className="py-2 font-bold">Last Service</th>
                        <th className="py-2 font-bold">Due Date</th>
                        <th className="py-2 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300">
                      {sortedRoller.map((item) => (
                        <tr key={item.id} className="border-b border-gray-200">
                          <td className="py-3 font-semibold text-black">{item.name}</td>
                          <td className="py-3 font-mono text-black text-xs">{item.code}</td>
                          <td className="py-3 text-black">{item.frequency || 'N/A'}</td>
                          <td className="py-3 text-black">{formatDate(item.lastCal)}</td>
                          <td className="py-3 text-black font-medium">{formatDate(item.dueDate)}</td>
                          <td className="py-3 text-black">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${item.remaining < 0 ? 'bg-red-100 text-red-800' :
                              item.remaining < 30 ? 'bg-amber-100 text-amber-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                              {item.remaining < 0 ? 'OVERDUE' :
                                item.remaining < 30 ? 'DUE SOON' :
                                  'OPERATIONAL'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


