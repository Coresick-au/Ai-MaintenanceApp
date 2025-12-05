import React, { useRef } from 'react';
import { Modal } from './UIComponents';
import { Icons } from '../constants/icons.jsx';
import { formatDate } from '../utils/helpers';
import { saveAs } from 'file-saver';
import { pdf } from '@react-pdf/renderer';
import { FullDashboardPDF } from './FullDashboardPDF';

export const FullDashboardPDFPreview = ({
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
        <FullDashboardPDF
          site={site}
          generatedDate={generatedDate}
        />
      )).toBlob();

      // Generate filename and download
      const fileName = `full-dashboard-${site.customer}-${site.name}-${new Date().toISOString().split('T')[0]}.pdf`;
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
                <h1 className="text-3xl font-black uppercase tracking-wider text-black mb-2">Full Dashboard Report</h1>
                <div className="text-black font-medium text-lg">{site.customer} | {site.name}</div>
                <div className="text-sm text-black mt-1">
                  <span>📍 </span>
                  {site.location}
                </div>
                <div className="text-sm text-black mt-2">
                  Generated: {formatDate(new Date().toISOString())}
                </div>
              </header>

              {/* DASHBOARD SUMMARY */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-black border-b border-gray-300 pb-2 mb-4">Dashboard Summary</h2>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 border border-gray-300 rounded bg-gray-50">
                    <div className="text-xs font-bold text-black uppercase">Total Assets</div>
                    <div className="text-2xl font-bold text-black">{(site.serviceData || []).length + (site.rollerData || []).length}</div>
                  </div>
                  <div className="p-4 border border-gray-300 rounded bg-red-50">
                    <div className="text-xs font-bold text-black uppercase">Critical</div>
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
                </div>
              </section>

              {/* SERVICE EQUIPMENT */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-black border-b border-gray-300 pb-2 mb-4">Service Equipment</h2>
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-300 text-black uppercase text-xs tracking-wider">
                      <th className="py-2 font-bold">Name</th>
                      <th className="py-2 font-bold">Code</th>
                      <th className="py-2 font-bold">Last Service</th>
                      <th className="py-2 font-bold">Due Date</th>
                      <th className="py-2 font-bold">Days Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {(site.serviceData || []).map((item) => (
                      <tr key={item.id} className="border-b border-gray-200">
                        <td className="py-3 font-semibold text-black">{item.name}</td>
                        <td className="py-3 font-mono text-black text-xs">{item.code}</td>
                        <td className="py-3 text-black">{formatDate(item.lastCal)}</td>
                        <td className="py-3 text-black font-medium">{formatDate(item.dueDate)}</td>
                        <td className="py-3 text-black">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            item.remaining < 0 ? 'bg-red-100 text-red-800' : 
                            item.remaining < 30 ? 'bg-amber-100 text-amber-800' : 
                            'bg-green-100 text-green-800'
                          }`}>
                            {item.remaining}
                          </span>
                        </td>
                      </tr>
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
                      <th className="py-2 font-bold">Name</th>
                      <th className="py-2 font-bold">Code</th>
                      <th className="py-2 font-bold">Last Service</th>
                      <th className="py-2 font-bold">Due Date</th>
                      <th className="py-2 font-bold">Days Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {(site.rollerData || []).map((item) => (
                      <tr key={item.id} className="border-b border-gray-200">
                        <td className="py-3 font-semibold text-black">{item.name}</td>
                        <td className="py-3 font-mono text-black text-xs">{item.code}</td>
                        <td className="py-3 text-black">{formatDate(item.lastCal)}</td>
                        <td className="py-3 text-black font-medium">{formatDate(item.dueDate)}</td>
                        <td className="py-3 text-black">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            item.remaining < 0 ? 'bg-red-100 text-red-800' : 
                            item.remaining < 30 ? 'bg-amber-100 text-amber-800' : 
                            'bg-green-100 text-green-800'
                          }`}>
                            {item.remaining}
                          </span>
                        </td>
                      </tr>
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

export default FullDashboardPDFPreview;
