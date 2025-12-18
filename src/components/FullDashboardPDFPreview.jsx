import React, { useRef } from 'react';
import { Modal } from './UIComponents';
import { Icons } from '../constants/icons.jsx';
import { formatDate } from '../utils/helpers';
import { saveAs } from 'file-saver';
import { pdf } from '@react-pdf/renderer';
import { FullDashboardPDF } from './FullDashboardPDF';
import { countUniqueAssets } from '../utils/assetUtils';

export const FullDashboardPDFPreview = ({
  isOpen,
  onClose,
  site,
  generatedDate
}) => {
  const modalContainerRef = useRef(null);
  const reportContentRef = useRef(null);
  const [sortConfig, setSortConfig] = React.useState({ key: 'remaining', direction: 'asc' });

  if (!isOpen || !site) return null;

  // Sorting function
  const sortData = (data, config) => {
    const sorted = [...data];
    sorted.sort((a, b) => {
      let aVal = a[config.key];
      let bVal = b[config.key];

      // Handle undefined/null values - push them to the end
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      // Handle date sorting
      if (config.key === 'lastCal' || config.key === 'dueDate') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      // Handle numeric sorting
      if (config.key === 'remaining') {
        aVal = Number(aVal);
        bVal = Number(bVal);
      }

      // Handle string sorting (name, code, opStatus)
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = typeof bVal === 'string' ? bVal.toLowerCase() : '';
      }

      if (aVal < bVal) return config.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return config.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <span className="text-gray-400 ml-1">⇅</span>;
    return sortConfig.direction === 'asc' ? <span className="ml-1">↑</span> : <span className="ml-1">↓</span>;
  };

  // reportType: 'service' | 'roller' | 'full'
  const handlePrint = async (event, reportType = 'full') => {
    let originalHTML;
    try {
      // Show loading state
      const button = event.currentTarget;
      originalHTML = button.innerHTML;
      button.innerHTML = '<span class="animate-pulse">Generating PDF...</span>';
      button.disabled = true;

      // Sort the data using current sort configuration
      const sortedServiceData = sortData(site.serviceData || [], sortConfig);
      const sortedRollerData = sortData(site.rollerData || [], sortConfig);

      // Determine which data to include based on report type
      let siteDataForPDF = { ...site };
      let filePrefix = 'full-dashboard';

      if (reportType === 'service') {
        siteDataForPDF.serviceData = sortedServiceData;
        siteDataForPDF.rollerData = []; // Empty roller data
        filePrefix = 'service-report';
      } else if (reportType === 'roller') {
        siteDataForPDF.serviceData = []; // Empty service data
        siteDataForPDF.rollerData = sortedRollerData;
        filePrefix = 'roller-report';
      } else {
        siteDataForPDF.serviceData = sortedServiceData;
        siteDataForPDF.rollerData = sortedRollerData;
      }

      // Create PDF using react-pdf with sorted data
      const blob = await pdf((
        <FullDashboardPDF
          site={siteDataForPDF}
          generatedDate={generatedDate}
          reportType={reportType}
        />
      )).toBlob();

      // Generate filename and download
      const fileName = `${filePrefix}-${site.customer}-${site.name}-${new Date().toISOString().split('T')[0]}.pdf`;
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

  return (
    <div ref={modalContainerRef} className="print-content fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:p-0 print:bg-white print:absolute print:inset-0 print:z-[9999]">
      {/* --- PREVIEW CONTAINER (Screen Mode) --- */}
      <div className="print-content-inner bg-slate-800 w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl overflow-auto flex flex-col print:h-auto print:shadow-none print:rounded-none print:w-full print:max-w-none print:bg-white">

        {/* --- MODAL HEADER (Hidden on Print) --- */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900 print:hidden">
          <div>
            <h3 className="font-bold text-lg text-slate-200 print:text-black">Full Dashboard Preview</h3>
            <p className="text-sm text-slate-400 print:text-black">Review the layout before printing.</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {site.serviceData && site.serviceData.length > 0 && (
              <button onClick={(e) => handlePrint(e, 'service')} className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors text-sm">
                <Icons.Printer size={16} /> Service Report
              </button>
            )}
            {site.rollerData && site.rollerData.length > 0 && (
              <button onClick={(e) => handlePrint(e, 'roller')} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors text-sm">
                <Icons.Printer size={16} /> Roller Report
              </button>
            )}
            <button onClick={(e) => handlePrint(e, 'full')} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors text-sm">
              <Icons.Printer size={16} /> Full Report
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
                <h1 className="text-3xl font-black uppercase tracking-wider text-black mb-2">Full Dashboard Report</h1>
                <div className="text-black font-medium text-lg">{site.customer} | {site.name}</div>
                <div className="text-sm text-black mt-1">
                  {site.location}
                </div>
                <div className="text-sm text-black mt-2">
                  Generated: {formatDate(new Date().toISOString())}
                </div>
              </header>

              {/* DASHBOARD SUMMARY */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-black border-b border-gray-300 pb-2 mb-4">Dashboard Summary</h2>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="p-4 border border-gray-300 rounded bg-gray-50">
                    <div className="text-xs font-bold text-black uppercase">Total Assets</div>
                    <div className="text-2xl font-bold text-black">{countUniqueAssets(site.serviceData, site.rollerData)}</div>
                  </div>
                  <div className="p-4 border border-gray-300 rounded bg-red-50">
                    <div className="text-xs font-bold text-black uppercase">Overdue</div>
                    <div className="text-2xl font-bold text-red-600">
                      {[...site.serviceData, ...site.rollerData].filter(i => i.remaining < 0).length}
                    </div>
                  </div>
                  <div className="p-4 border border-gray-300 rounded bg-amber-50">
                    <div className="text-xs font-bold text-black uppercase">Due Soon</div>
                    <div className="text-2xl font-bold text-amber-600">
                      {[...site.serviceData, ...site.rollerData].filter(i => i.remaining >= 0 && i.remaining < 30).length}
                    </div>
                  </div>
                  <div className="p-4 border border-gray-300 rounded bg-green-50">
                    <div className="text-xs font-bold text-black uppercase">Healthy</div>
                    <div className="text-2xl font-bold text-green-600">
                      {[...site.serviceData, ...site.rollerData].filter(i => i.remaining >= 30).length}
                    </div>
                  </div>
                </div>

                {/* OVERALL HEALTH BAR */}
                <div className="p-4 border border-gray-300 rounded bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase">Overall Health</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-xs text-red-600 font-medium">{Math.round(([...site.serviceData, ...site.rollerData].filter(i => i.remaining < 0).length / ([...site.serviceData, ...site.rollerData].length)) * 100)}%</span></div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div><span className="text-xs text-amber-600 font-medium">{Math.round(([...site.serviceData, ...site.rollerData].filter(i => i.remaining >= 0 && i.remaining < 30).length / ([...site.serviceData, ...site.rollerData].length)) * 100)}%</span></div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-xs text-green-600 font-medium">{Math.round(([...site.serviceData, ...site.rollerData].filter(i => i.remaining >= 30).length / ([...site.serviceData, ...site.rollerData].length)) * 100)}%</span></div>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex">
                    <div className="bg-red-500 transition-all duration-500" style={{ width: `${([...site.serviceData, ...site.rollerData].filter(i => i.remaining < 0).length / ([...site.serviceData, ...site.rollerData].length)) * 100}%` }}></div>
                    <div className="bg-amber-500 transition-all duration-500" style={{ width: `${([...site.serviceData, ...site.rollerData].filter(i => i.remaining >= 0 && i.remaining < 30).length / ([...site.serviceData, ...site.rollerData].length)) * 100}%` }}></div>
                    <div className="bg-green-500 transition-all duration-500" style={{ width: `${([...site.serviceData, ...site.rollerData].filter(i => i.remaining >= 30).length / ([...site.serviceData, ...site.rollerData].length)) * 100}%` }}></div>
                  </div>
                  <div className="mt-2 text-center text-xs text-gray-400">
                    <span className="font-bold text-red-600 text-sm">{Math.round(([...site.serviceData, ...site.rollerData].filter(i => i.remaining < 0).length / ([...site.serviceData, ...site.rollerData].length)) * 100)}% Overdue</span> ({[...site.serviceData, ...site.rollerData].filter(i => i.remaining < 0).length} assets)
                  </div>
                </div>
              </section>

              {/* SERVICE EQUIPMENT */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-black border-b border-gray-300 pb-2 mb-4">Service Equipment</h2>
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-300 text-black uppercase text-xs tracking-wider">
                      <th className="py-2 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>Name <SortIcon columnKey="name" /></th>
                      <th className="py-2 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('code')}>Code <SortIcon columnKey="code" /></th>
                      <th className="py-2 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('lastCal')}>Last Service <SortIcon columnKey="lastCal" /></th>
                      <th className="py-2 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('dueDate')}>Due Date <SortIcon columnKey="dueDate" /></th>
                      <th className="py-2 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('remaining')}>Days Remaining <SortIcon columnKey="remaining" /></th>
                      <th className="py-2 font-bold text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('opStatus')}>Operational Status <SortIcon columnKey="opStatus" /></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {sortData(site.serviceData || [], sortConfig).map((item) => (
                      <React.Fragment key={item.id}>
                        <tr className="border-b border-gray-200">
                          <td className="py-3 font-semibold text-black">{item.name}</td>
                          <td className="py-3 font-mono text-black text-xs">{item.code}</td>
                          <td className="py-3 text-black">{formatDate(item.lastCal)}</td>
                          <td className="py-3 text-black font-medium">{formatDate(item.dueDate)}</td>
                          <td className="py-3 text-black">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${item.remaining < 0 ? 'bg-red-100 text-red-800' :
                              item.remaining < 30 ? 'bg-amber-100 text-amber-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                              {item.remaining}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${item.opStatus === 'Down' ? 'bg-red-100 text-red-800' :
                              item.opStatus === 'Warning' ? 'bg-amber-100 text-amber-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                              {item.opStatus === 'Down' ? 'DOWN/CRITICAL' :
                                item.opStatus === 'Warning' ? 'WARNING' :
                                  'OPERATIONAL'}
                            </span>
                          </td>
                        </tr>
                        {(item.opStatus === 'Down' || item.opStatus === 'Warning' || item.opStatus === 'Out of Service') && item.opNote && (
                          <tr className="border-b border-gray-200 bg-red-50/50">
                            <td colSpan="6" className="py-2 px-4 text-xs italic text-slate-600">
                              <span className="font-bold text-red-800">Comment:</span> {item.opNote}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </section>

              {/* ROLLER EQUIPMENT */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-black border-b border-gray-300 pb-2 mb-4">Roller Equipment</h2>
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-300 text-black uppercase text-xs tracking-wider">
                      <th className="py-2 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>Name <SortIcon columnKey="name" /></th>
                      <th className="py-2 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('code')}>Code <SortIcon columnKey="code" /></th>
                      <th className="py-2 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('lastCal')}>Last Service <SortIcon columnKey="lastCal" /></th>
                      <th className="py-2 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('dueDate')}>Due Date <SortIcon columnKey="dueDate" /></th>
                      <th className="py-2 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('remaining')}>Days Remaining <SortIcon columnKey="remaining" /></th>
                      <th className="py-2 font-bold text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('opStatus')}>Operational Status <SortIcon columnKey="opStatus" /></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {sortData(site.rollerData || [], sortConfig).map((item) => (
                      <React.Fragment key={item.id}>
                        <tr className="border-b border-gray-200">
                          <td className="py-3 font-semibold text-black">{item.name}</td>
                          <td className="py-3 font-mono text-black text-xs">{item.code}</td>
                          <td className="py-3 text-black">{formatDate(item.lastCal)}</td>
                          <td className="py-3 text-black font-medium">{formatDate(item.dueDate)}</td>
                          <td className="py-3 text-black">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${item.remaining < 0 ? 'bg-red-100 text-red-800' :
                              item.remaining < 30 ? 'bg-amber-100 text-amber-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                              {item.remaining}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${item.opStatus === 'Down' ? 'bg-red-100 text-red-800' :
                              item.opStatus === 'Warning' ? 'bg-amber-100 text-amber-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                              {item.opStatus === 'Down' ? 'DOWN/CRITICAL' :
                                item.opStatus === 'Warning' ? 'WARNING' :
                                  'OPERATIONAL'}
                            </span>
                          </td>
                        </tr>
                        {(item.opStatus === 'Down' || item.opStatus === 'Warning' || item.opStatus === 'Out of Service') && item.opNote && (
                          <tr className="border-b border-gray-200 bg-red-50/50">
                            <td colSpan="6" className="py-2 px-4 text-xs italic text-slate-600">
                              <span className="font-bold text-red-800">Comment:</span> {item.opNote}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </section>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


