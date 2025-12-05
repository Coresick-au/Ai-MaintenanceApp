import React, { useRef } from 'react';
import { Modal } from './UIComponents';
import { Icons } from '../constants/icons.jsx';
import { formatDate } from '../utils/helpers';
import { saveAs } from 'file-saver';
import { pdf } from '@react-pdf/renderer';
import { AssetSpecsPDF } from './AssetSpecsPDF';

export const AssetSpecsPDFPreview = ({
  isOpen,
  onClose,
  assets,
  generatedDate
}) => {
  const modalContainerRef = useRef(null);
  const reportContentRef = useRef(null);

  if (!isOpen || !assets || assets.length === 0) return null;

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
        <AssetSpecsPDF
          assets={assets}
          generatedDate={generatedDate}
        />
      )).toBlob();

      // Generate filename and download
      const fileName = `asset-specs-${assets.length}-assets-${new Date().toISOString().split('T')[0]}.pdf`;
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

  const getStatusStyle = (asset) => {
    if (asset.opStatus === 'Down') return 'bg-red-100 text-red-800';
    if (asset.opStatus === 'Warning') return 'bg-amber-100 text-amber-800';
    if (asset.remaining < 0) return 'bg-red-100 text-red-800';
    if (asset.remaining < 30) return 'bg-amber-100 text-amber-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (asset) => {
    if (asset.opStatus === 'Down') return 'DOWN/CRITICAL';
    if (asset.opStatus === 'Warning') return 'WARNING';
    if (asset.remaining < 0) return 'OVERDUE';
    if (asset.remaining < 30) return 'DUE SOON';
    return 'OPERATIONAL';
  };

  return (
    <div ref={modalContainerRef} className="print-content fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:p-0 print:bg-white print:absolute print:inset-0 print:z-[9999]">
      {/* --- PREVIEW CONTAINER (Screen Mode) --- */}
      <div className="print-content-inner bg-slate-800 w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl overflow-auto flex flex-col print:h-auto print:shadow-none print:rounded-none print:w-full print:max-w-none print:bg-white">
        
        {/* --- MODAL HEADER (Hidden on Print) --- */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900 print:hidden">
          <div>
            <h3 className="font-bold text-lg text-slate-200 print:text-black">Asset Specs Preview ({assets.length} assets)</h3>
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
                <h1 className="text-3xl font-black uppercase tracking-wider text-black mb-2">Asset Specifications</h1>
                <div className="text-black font-medium text-lg">
                  {assets.length} Asset{assets.length > 1 ? 's' : ''} Selected
                </div>
                <div className="text-sm text-black mt-2">
                  Generated: {formatDate(new Date().toISOString())}
                </div>
              </header>

              {/* ASSET LIST */}
              {assets.map((assetWithSpecs, index) => (
                <section key={assetWithSpecs.asset.id} className={`mb-12 ${index < assets.length - 1 ? 'border-b border-gray-300 pb-8' : ''}`}>
                  
                  {/* Page break indicator */}
                  {index > 0 && (
                    <div className="text-center text-sm text-gray-500 mb-4 print:mb-8">
                      --- Page {index + 1} ---
                    </div>
                  )}

                  {/* Asset Information */}
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-black mb-4">
                      {assetWithSpecs.asset.name} ({assetWithSpecs.asset.code})
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded">
                      <div>
                        <div className="text-xs font-bold text-gray-600 uppercase">Asset Code</div>
                        <div className="font-semibold">{assetWithSpecs.asset.code}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-600 uppercase">Weigher ID</div>
                        <div className="font-semibold">{assetWithSpecs.specs.weigher}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-600 uppercase">Description</div>
                        <div className="font-semibold">{assetWithSpecs.specs.description}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-600 uppercase">Status</div>
                        <div>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusStyle(assetWithSpecs.asset)}`}>
                            {getStatusText(assetWithSpecs.asset)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-600 uppercase">Last Service</div>
                        <div className="font-semibold">{formatDate(assetWithSpecs.asset.lastCal)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-600 uppercase">Due Date</div>
                        <div className="font-semibold">{formatDate(assetWithSpecs.asset.dueDate)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Scale Details */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-black mb-3">Scale Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-bold text-gray-600 uppercase">Scale Type</div>
                        <div className="font-semibold">{assetWithSpecs.specs.scaleType || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-600 uppercase">Integrator Controller</div>
                        <div className="font-semibold">{assetWithSpecs.specs.integratorController || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-600 uppercase">Speed Sensor Type</div>
                        <div className="font-semibold">{assetWithSpecs.specs.speedSensorType || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-600 uppercase">Load Cell Brand</div>
                        <div className="font-semibold">{assetWithSpecs.specs.loadCellBrand || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-600 uppercase">Load Cell Size</div>
                        <div className="font-semibold">{assetWithSpecs.specs.loadCellSize || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-600 uppercase">Load Cell Sensitivity</div>
                        <div className="font-semibold">{assetWithSpecs.specs.loadCellSensitivity || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-600 uppercase">Number of Load Cells</div>
                        <div className="font-semibold">{assetWithSpecs.specs.numberOfLoadCells || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Roller Details */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-black mb-3">Roller Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-bold text-gray-600 uppercase">Roller Dimensions (Dia x Face x B2B x Total x Shaft x Slot (#) Adjustment Type)</div>
                        <div className="font-mono text-sm bg-gray-100 p-2 rounded">
                          {assetWithSpecs.specs.rollDims || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-600 uppercase">Adjustment Type</div>
                        <div className="font-semibold">{assetWithSpecs.specs.adjustmentType || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Billet Details */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-black mb-3">Billet Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-bold text-gray-600 uppercase">Billet Weight Type</div>
                        <div className="font-semibold">{assetWithSpecs.specs.billetWeightType || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-600 uppercase">Billet Weight Size</div>
                        <div className="font-semibold">{assetWithSpecs.specs.billetWeightSize || 'N/A'}</div>
                      </div>
                    </div>
                    {assetWithSpecs.specs.billetWeightIds && assetWithSpecs.specs.billetWeightIds.length > 0 && (
                      <div className="mt-4">
                        <div className="text-xs font-bold text-gray-600 uppercase mb-2">Billet Weight IDs</div>
                        <div className="font-mono text-sm bg-gray-100 p-2 rounded">
                          {assetWithSpecs.specs.billetWeightIds.join(', ')}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Comments */}
                  {assetWithSpecs.specs.notes && assetWithSpecs.specs.notes.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-black mb-3">Comments ({assetWithSpecs.specs.notes.length})</h3>
                      <div className="space-y-2">
                        {assetWithSpecs.specs.notes.map((note, noteIndex) => (
                          <div key={note.id || noteIndex} className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-semibold bg-gray-200 px-2 py-1 rounded">
                                {note.author || 'UNK'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(note.timestamp)}
                              </span>
                            </div>
                            <div className="text-sm">{note.content}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Operational Note */}
                  {assetWithSpecs.asset.opNote && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-black mb-3">Operational Note</h3>
                      <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded">
                        <div className="text-sm">{assetWithSpecs.asset.opNote}</div>
                      </div>
                    </div>
                  )}

                </section>
              ))}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetSpecsPDFPreview;
