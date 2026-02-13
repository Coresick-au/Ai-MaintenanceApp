import React, { useRef, useState } from 'react';
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
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen || !site) return null;

  const handlePrint = async () => {
    try {
      setIsGenerating(true);

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

      const fileName = `master-equipment-list-${site.customer}-${site.name}-${new Date().toISOString().split('T')[0]}.pdf`;
      saveAs(blob, fileName);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Combine and filter data - same logic as MasterListPDF for consistent output
  const allAssets = [...serviceData, ...rollerData].filter(asset => {
    if (!showArchived && asset.active === false) return false;
    return true;
  }).map(asset => {
    const spec = specData.find(s =>
      s.weigher === asset.weigher ||
      s.altCode === asset.code ||
      s.weigher === asset.code
    );
    return { ...asset, spec: spec || {} };
  });

  // Sort consistently: by name then code
  allAssets.sort((a, b) => a.name.localeCompare(b.name) || (a.code || '').localeCompare(b.code || ''));

  const formatSpecData = (spec) => {
    if (!spec) return '-';
    const parts = [];
    if (spec.loadCellBrand) parts.push(spec.loadCellBrand);
    if (spec.loadCellSize) parts.push(spec.loadCellSize);
    if (spec.loadCellSensitivity) parts.push(spec.loadCellSensitivity);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  const formatBilletInfo = (spec) => {
    if (!spec) return '-';
    const parts = [];
    if (spec.billetWeightType) parts.push(spec.billetWeightType);
    if (spec.billetWeightSize) parts.push(spec.billetWeightSize);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  const formatRollerDimensions = (spec) => {
    if (!spec) return '-';
    let rollDims = spec.rollDims || '-';
    if (typeof rollDims === 'object' && rollDims !== null) {
      rollDims = rollDims.value || JSON.stringify(rollDims);
    }
    if (typeof rollDims === 'string') {
      rollDims = rollDims.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }
    return rollDims || '-';
  };

  // Paginate to match PDF (25 rows per page)
  const rowsPerPage = 25;
  const totalPages = Math.ceil(allAssets.length / rowsPerPage);
  const pages = [];
  for (let i = 0; i < allAssets.length; i += rowsPerPage) {
    pages.push(allAssets.slice(i, i + rowsPerPage));
  }

  // Column widths matching the PDF
  const colWidths = {
    name: '14%', code: '8%', type: '5%', lastCal: '7%', calDue: '7%',
    scaleType: '8%', integrator: '8%', speedSensor: '8%', loadCell: '8%',
    billet: '7%', rollerDims: '14%', adjustment: '6%'
  };

  return (
    <div className="print-content fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-800 w-full max-w-7xl h-[90vh] rounded-xl shadow-2xl overflow-auto flex flex-col">

        {/* MODAL HEADER */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900 flex-shrink-0">
          <div>
            <h3 className="font-bold text-lg text-slate-200">Master Equipment List Preview</h3>
            <p className="text-sm text-slate-400">Review the layout before printing.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              disabled={isGenerating}
              className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors ${isGenerating ? 'bg-blue-800 text-blue-300 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              {isGenerating ? (
                <><Icons.Loader className="animate-spin" size={18} /> Generating PDF...</>
              ) : (
                <><Icons.Printer size={18} /> Print to PDF</>
              )}
            </button>
            <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-lg font-bold transition-colors">
              Close
            </button>
          </div>
        </div>

        {/* PDF PREVIEW - mimics landscape A4 pages */}
        <div className="flex-1 overflow-auto bg-slate-600 p-6">
          {pages.map((pageAssets, pageIdx) => (
            <div
              key={pageIdx}
              className="bg-white text-black mx-auto mb-6 shadow-xl"
              style={{ width: '1100px', minHeight: '750px', padding: '30px', position: 'relative' }}
            >
              {/* Page Header */}
              <div style={{ borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '16px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '6px' }}>Master Equipment List</h1>
                <div style={{ fontSize: '12px', color: '#333', marginBottom: '2px' }}>
                  Customer: {site.customer} | Site: {site.name} | Location: {site.location}
                </div>
                <div style={{ fontSize: '11px', color: '#666' }}>
                  Generated: {formatDate(new Date().toISOString())} | Page {pageIdx + 1} of {totalPages} | Showing {pageIdx * rowsPerPage + 1}-{Math.min((pageIdx + 1) * rowsPerPage, allAssets.length)} of {allAssets.length} assets
                </div>
              </div>

              {/* Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0' }}>
                    <th style={{ border: '1px solid #999', padding: '4px', textAlign: 'left', fontWeight: 'bold', width: colWidths.name }}>Asset Name</th>
                    <th style={{ border: '1px solid #999', padding: '4px', textAlign: 'left', fontWeight: 'bold', width: colWidths.code }}>Code</th>
                    <th style={{ border: '1px solid #999', padding: '4px', textAlign: 'left', fontWeight: 'bold', width: colWidths.type }}>Type</th>
                    <th style={{ border: '1px solid #999', padding: '4px', textAlign: 'left', fontWeight: 'bold', width: colWidths.lastCal }}>Last Cal</th>
                    <th style={{ border: '1px solid #999', padding: '4px', textAlign: 'left', fontWeight: 'bold', width: colWidths.calDue }}>Cal Due</th>
                    <th style={{ border: '1px solid #999', padding: '4px', textAlign: 'left', fontWeight: 'bold', width: colWidths.scaleType }}>Scale Type</th>
                    <th style={{ border: '1px solid #999', padding: '4px', textAlign: 'left', fontWeight: 'bold', width: colWidths.integrator }}>Integrator</th>
                    <th style={{ border: '1px solid #999', padding: '4px', textAlign: 'left', fontWeight: 'bold', width: colWidths.speedSensor }}>Speed Sensor</th>
                    <th style={{ border: '1px solid #999', padding: '4px', textAlign: 'left', fontWeight: 'bold', width: colWidths.loadCell }}>Load Cell</th>
                    <th style={{ border: '1px solid #999', padding: '4px', textAlign: 'left', fontWeight: 'bold', width: colWidths.billet }}>Billet Info</th>
                    <th style={{ border: '1px solid #999', padding: '4px', textAlign: 'left', fontWeight: 'bold', width: colWidths.rollerDims }}>Roller Dims</th>
                    <th style={{ border: '1px solid #999', padding: '4px', textAlign: 'left', fontWeight: 'bold', width: colWidths.adjustment }}>Adj. Type</th>
                  </tr>
                </thead>
                <tbody>
                  {pageAssets.map((asset) => (
                    <tr key={asset.id} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ border: '1px solid #ccc', padding: '3px 4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {asset.name || ''}{asset.active === false ? ' (Archived)' : ''}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '3px 4px', fontFamily: 'monospace', fontSize: '9px' }}>{asset.code || ''}</td>
                      <td style={{ border: '1px solid #ccc', padding: '3px 4px' }}>{asset.id?.startsWith('s-') ? 'Service' : 'Roller'}</td>
                      <td style={{ border: '1px solid #ccc', padding: '3px 4px' }}>{formatDate(asset.lastCal)}</td>
                      <td style={{ border: '1px solid #ccc', padding: '3px 4px' }}>{formatDate(asset.dueDate)}</td>
                      <td style={{ border: '1px solid #ccc', padding: '3px 4px' }}>{asset.spec?.scaleType || '-'}</td>
                      <td style={{ border: '1px solid #ccc', padding: '3px 4px' }}>{asset.spec?.integratorController || '-'}</td>
                      <td style={{ border: '1px solid #ccc', padding: '3px 4px' }}>{asset.spec?.speedSensorType || '-'}</td>
                      <td style={{ border: '1px solid #ccc', padding: '3px 4px' }}>{formatSpecData(asset.spec)}</td>
                      <td style={{ border: '1px solid #ccc', padding: '3px 4px' }}>{formatBilletInfo(asset.spec)}</td>
                      <td style={{ border: '1px solid #ccc', padding: '3px 4px' }}>{formatRollerDimensions(asset.spec)}</td>
                      <td style={{ border: '1px solid #ccc', padding: '3px 4px' }}>{asset.spec?.adjustmentType || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
