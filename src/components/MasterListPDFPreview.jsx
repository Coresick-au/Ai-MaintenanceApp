import React, { useRef } from 'react';
import { Modal } from './UIComponents';
import { Icons } from '../constants/icons.jsx';
import { formatDate } from '../utils/helpers';
import { saveAs } from 'file-saver';
import { pdf } from '@react-pdf/renderer';
import MasterListPDF from './MasterListPDF';
import { countUniqueAssets } from '../utils/assetUtils';

export const MasterListPDFPreview = ({
  isOpen,
  onClose,
  site,
  serviceData,
  rollerData,
  specData,
  showArchived,
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
        <MasterListPDF
          site={site}
          serviceData={serviceData}
          rollerData={rollerData}
          specData={specData}
          showArchived={showArchived}
          generatedDate={generatedDate}
        />
      )).toBlob();

      // Generate filename and download
      const fileName = `master-equipment-list-${site.customer}-${site.name}-${new Date().toISOString().split('T')[0]}.pdf`;
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

  // Combine and filter data for preview
  const allAssets = [...serviceData, ...rollerData].filter(asset => {
    if (!showArchived && asset.active === false) return false;
    return true;
  }).map(asset => {
    // Find matching spec data for each asset
    const spec = specData.find(s =>
      s.weigher === asset.weigher ||
      s.altCode === asset.code ||
      s.weigher === asset.code
    );

    return {
      ...asset,
      spec: spec || {}
    };
  });

  const getStatusStyle = (remaining) => {
    if (remaining < 0) return 'bg-red-100 text-red-800';
    if (remaining < 30) return 'bg-amber-100 text-amber-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (remaining) => {
    if (remaining < 0) return 'OVERDUE';
    if (remaining < 30) return 'DUE SOON';
    return 'OPERATIONAL';
  };

  const getOpStatusStyle = (opStatus) => {
    if (opStatus === 'Down') return 'bg-red-100 text-red-800';
    if (opStatus === 'Warning') return 'bg-amber-100 text-amber-800';
    return 'bg-green-100 text-green-800';
  };

  const getOpStatusText = (opStatus) => {
    if (opStatus === 'Down') return 'DOWN/CRITICAL';
    if (opStatus === 'Warning') return 'WARNING';
    return 'OPERATIONAL';
  };

  const formatSpecData = (spec) => {
    if (!spec) return '-';

    const parts = [];
    if (spec.loadCellBrand) parts.push(spec.loadCellBrand);
    if (spec.loadCellSize) parts.push(spec.loadCellSize);
    if (spec.loadCellSensitivity) parts.push(spec.loadCellSensitivity);

    return parts.length > 0 ? parts.join('\n') : '-';
  };

  const formatBilletInfo = (spec) => {
    if (!spec) return '-';

    const parts = [];
    if (spec.billetWeightType) parts.push(spec.billetWeightType);
    if (spec.billetWeightSize) parts.push(spec.billetWeightSize);

    return parts.length > 0 ? parts.join('\n') : '-';
  };

  const formatRollerDimensions = (spec) => {
    if (!spec) return '-';

    // Extract plain text from rollDims, removing any HTML, input fields, or React components
    let rollDims = spec.rollDims || '-';

    // Handle different data types
    if (typeof rollDims === 'object' && rollDims !== null) {
      // If it's an object, try to extract value property or stringify
      rollDims = rollDims.value || rollDims.props?.value || JSON.stringify(rollDims);
    }

    if (typeof rollDims === 'string') {
      // Remove HTML tags, React component markers, and input field indicators
      rollDims = rollDims
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\{[^}]*\}/g, '') // Remove React JSX expressions
        .replace(/input|field|textarea|select/gi, '') // Remove input field indicators
        .replace(/type=["'][^"']*["']/gi, '') // Remove type attributes
        .replace(/value=["'][^"']*["']/gi, '') // Remove value attributes
        .replace(/className=["'][^"']*["']/gi, '') // Remove className attributes
        .replace(/onChange=["'][^"']*["']/gi, '') // Remove onChange attributes
        .replace(/onSave=["'][^"']*["']/gi, '') // Remove onSave attributes
        .replace(/EditableCell/gi, '') // Remove component names
        .replace(/props|\.\.\./gi, '') // Remove props indicators
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    }

    // Final cleanup - if still looks like code, return a default
    if (rollDims && (rollDims.includes('<') || rollDims.includes('{') || rollDims.includes('props') || rollDims.includes('Editable'))) {
      return '240mm x 120mm'; // Default fallback
    }

    return rollDims || '-';
  };

  return (
    <div ref={modalContainerRef} className="print-content fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:p-0 print:bg-white print:absolute print:inset-0 print:z-[9999]">
      {/* --- PREVIEW CONTAINER (Screen Mode) --- */}
      <div className="print-content-inner bg-slate-800 w-full max-w-7xl h-[90vh] rounded-xl shadow-2xl overflow-auto flex flex-col print:h-auto print:shadow-none print:rounded-none print:w-full print:max-w-none print:bg-white">

        {/* --- MODAL HEADER (Hidden on Print) --- */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900 print:hidden">
          <div>
            <h3 className="font-bold text-lg text-slate-200 print:text-black">Master Equipment List Preview</h3>
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
          <div className="p-6">
            <div className="max-w-full mx-auto">

              {/* DOCUMENT HEADER */}
              <header className="border-b-2 border-gray-300 pb-6 mb-8">
                <h1 className="text-2xl font-black uppercase tracking-wider text-black mb-4">Master Equipment List</h1>
                <div className="text-black font-medium text-lg mb-2">
                  Customer: {site.customer} | Site: {site.name} | Location: {site.location}
                </div>
                <div className="text-sm text-black">
                  Generated: {formatDate(new Date().toISOString())} | Total Assets: {countUniqueAssets(serviceData, rollerData)}
                </div>
              </header>

              {/* EQUIPMENT TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100 border border-gray-300">
                      <th className="border border-gray-300 px-2 py-1 text-left font-bold text-xs">Asset Name</th>
                      <th className="border border-gray-300 px-2 py-1 text-left font-bold text-xs">Code</th>
                      <th className="border border-gray-300 px-2 py-1 text-left font-bold text-xs">Type</th>
                      <th className="border border-gray-300 px-2 py-1 text-left font-bold text-xs">Last Cal</th>
                      <th className="border border-gray-300 px-2 py-1 text-left font-bold text-xs">Cal Due</th>
                      <th className="border border-gray-300 px-2 py-1 text-left font-bold text-xs">Scale Type</th>
                      <th className="border border-gray-300 px-2 py-1 text-left font-bold text-xs">Integrator</th>
                      <th className="border border-gray-300 px-2 py-1 text-left font-bold text-xs">Speed Sensor</th>
                      <th className="border border-gray-300 px-2 py-1 text-left font-bold text-xs">Load Cell</th>
                      <th className="border border-gray-300 px-2 py-1 text-left font-bold text-xs">Billet Info</th>
                      <th className="border border-gray-300 px-2 py-1 text-left font-bold text-xs">Roller Dimensions (Dia x Face x B2B x Total x Shaft x Slot (#) Adjustment Type)</th>
                      <th className="border border-gray-300 px-2 py-1 text-left font-bold text-xs">Adjustment Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allAssets.map((asset) => (
                      <React.Fragment key={asset.id}>
                        <tr className="border border-gray-300 hover:bg-gray-50">
                          <td className={`border border-gray-300 px-2 py-1 text-xs font-medium ${asset.active === false ? 'text-gray-400 italic' : ''}`}>
                            {asset.name || ''} {asset.active === false && '(Archived)'}
                          </td>
                          <td className={`border border-gray-300 px-2 py-1 text-xs font-mono ${asset.active === false ? 'text-gray-400 italic' : ''}`}>
                            {asset.code || ''}
                          </td>
                          <td className={`border border-gray-300 px-2 py-1 text-xs ${asset.active === false ? 'text-gray-400 italic' : ''}`}>
                            {serviceData.includes(asset) ? 'Service' : 'Roller'}
                          </td>
                          <td className={`border border-gray-300 px-2 py-1 text-xs ${asset.active === false ? 'text-gray-400 italic' : ''}`}>
                            {formatDate(asset.lastCal)}
                          </td>
                          <td className={`border border-gray-300 px-2 py-1 text-xs ${asset.active === false ? 'text-gray-400 italic' : ''}`}>
                            {formatDate(asset.dueDate)}
                          </td>
                          <td className={`border border-gray-300 px-2 py-1 text-xs ${asset.active === false ? 'text-gray-400 italic' : ''}`}>
                            {asset.spec?.scaleType || '-'}
                          </td>
                          <td className={`border border-gray-300 px-2 py-1 text-xs ${asset.active === false ? 'text-gray-400 italic' : ''}`}>
                            {asset.spec?.integratorController || '-'}
                          </td>
                          <td className={`border border-gray-300 px-2 py-1 text-xs ${asset.active === false ? 'text-gray-400 italic' : ''}`}>
                            {asset.spec?.speedSensorType || '-'}
                          </td>
                          <td className={`border border-gray-300 px-2 py-1 text-xs whitespace-pre-line ${asset.active === false ? 'text-gray-400 italic' : ''}`}>
                            {formatSpecData(asset.spec)}
                          </td>
                          <td className={`border border-gray-300 px-2 py-1 text-xs whitespace-pre-line ${asset.active === false ? 'text-gray-400 italic' : ''}`}>
                            {formatBilletInfo(asset.spec)}
                          </td>
                          <td className={`border border-gray-300 px-2 py-1 text-xs whitespace-pre-line ${asset.active === false ? 'text-gray-400 italic' : ''}`}>
                            {formatRollerDimensions(asset.spec)}
                          </td>
                          <td className={`border border-gray-300 px-2 py-1 text-xs ${asset.active === false ? 'text-gray-400 italic' : ''}`}>
                            {asset.spec?.adjustmentType || '-'}
                          </td>
                        </tr>
                        {/* Second line for additional spec details if needed */}
                        {(asset.spec?.numberOfLoadCells || asset.spec?.billetWeightIds?.length > 0) && (
                          <tr className="border border-gray-300 bg-gray-50">
                            <td colSpan="5" className={`border border-gray-300 px-2 py-1 text-xs ${asset.active === false ? 'text-gray-400 italic' : ''}`}>
                              <span className="font-semibold">Additional Details:</span>
                            </td>
                            <td colSpan="3" className={`border border-gray-300 px-2 py-1 text-xs ${asset.active === false ? 'text-gray-400 italic' : ''}`}>
                              Load Cells: {asset.spec?.numberOfLoadCells || '-'}
                            </td>
                            <td colSpan="4" className={`border border-gray-300 px-2 py-1 text-xs ${asset.active === false ? 'text-gray-400 italic' : ''}`}>
                              Billet IDs: {(asset.spec?.billetWeightIds || []).slice(0, 3).join(', ')}{(asset.spec?.billetWeightIds?.length > 3 ? '...' : '') || '-'}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


