import React, { useState } from 'react';
import { Modal, Button } from './UIComponents';
import { PDFImportComponent } from './PDFImportComponent';
import { Icons } from '../constants/icons.jsx';

export const PDFImportModal = ({ isOpen, onClose, onImportCalibrationData, asset }) => {
  const [extractedData, setExtractedData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [importError, setImportError] = useState(null);

  const handleDataExtracted = (data) => {
    if (data.error) {
      setImportError(data.error);
    } else {
      setExtractedData(data);
      setShowPreview(true);
      setImportError(null);
    }
  };

  const handleImportData = () => {
    if (extractedData && onImportCalibrationData) {
      try {
        onImportCalibrationData(extractedData);
        onClose();
      } catch (error) {
        setImportError(error.message);
      }
    }
  };

  const handleClose = () => {
    setExtractedData(null);
    setShowPreview(false);
    setImportError(null);
    onClose();
  };

  const handleBackToUpload = () => {
    setShowPreview(false);
    setExtractedData(null);
    setImportError(null);
  };

  return (
    <Modal 
      title="Import Calibration Report" 
      onClose={handleClose}
      size="large"
    >
      <div className="space-y-6">
        {/* Asset Information */}
        {asset && (
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icons.Activity className="text-cyan-400" size={16} />
              <span className="text-sm font-semibold text-cyan-400">Target Asset</span>
            </div>
            <div className="text-white font-medium">{asset.name}</div>
            <div className="text-xs text-slate-400">{asset.code} • {asset.type}</div>
          </div>
        )}

        {/* Error Display */}
        {importError && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Icons.XCircle className="text-red-400 mt-0.5 flex-shrink-0" size={20} />
              <div className="text-sm text-red-300">
                <p className="font-semibold mb-1">PDF Import Error</p>
                <p className="text-xs">{importError}</p>
                <div className="mt-3">
                  <Button 
                    onClick={handleBackToUpload}
                    variant="secondary"
                    size="sm"
                  >
                    <Icons.ArrowLeft size={14} />
                    Try Different PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Step */}
        {!showPreview && !importError && (
          <>
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Icons.Info className="text-blue-400 mt-0.5 flex-shrink-0" size={20} />
                <div className="text-sm text-blue-300">
                  <p className="font-semibold mb-1">PDF Import Instructions</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Upload a calibration report PDF to extract structured data</li>
                    <li>The system will automatically parse calibration values and comments</li>
                    <li>You'll be able to review and edit the extracted data before importing</li>
                    <li>Supported formats: Standard calibration reports with tabular data</li>
                  </ul>
                </div>
              </div>
            </div>

            <PDFImportComponent onDataExtracted={handleDataExtracted} />
          </>
        )}

        {/* Preview Step */}
        {showPreview && extractedData && (
          <>
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Icons.CheckCircle className="text-green-400 mt-0.5 flex-shrink-0" size={20} />
                <div className="text-sm text-green-300">
                  <p className="font-semibold mb-1">Data Extraction Complete</p>
                  <p className="text-xs">
                    Successfully extracted {extractedData.tableData?.length || 0} data rows 
                    {extractedData.comments && ' and comments'} from the PDF.
                  </p>
                </div>
              </div>
            </div>

            {/* Extracted Data Preview */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Icons.FileText size={16} />
                Extracted Data Preview
              </h4>
              
              {extractedData.tableData && extractedData.tableData.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-xs font-medium text-slate-400 mb-2">Calibration Data</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-2 px-2 text-slate-400">Description</th>
                          <th className="text-left py-2 px-2 text-slate-400">As Found</th>
                          <th className="text-left py-2 px-2 text-slate-400">As Left</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extractedData.tableData.map((row, index) => (
                          <tr key={index} className="border-b border-slate-800">
                            <td className="py-2 px-2 text-slate-300">{row.description}</td>
                            <td className="py-2 px-2 text-slate-300 font-mono">{row.asFound}</td>
                            <td className="py-2 px-2 text-slate-300 font-mono">{row.asLeft}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {extractedData.comments && (
                <div>
                  <h5 className="text-xs font-medium text-slate-400 mb-2">Comments & Notes</h5>
                  <div className="bg-slate-800 rounded p-3 text-xs text-slate-300 whitespace-pre-wrap">
                    {extractedData.comments}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between gap-3 pt-4 border-t border-slate-700">
              <Button 
                onClick={handleBackToUpload} 
                variant="secondary"
              >
                <Icons.ArrowLeft size={16} />
                Back to Upload
              </Button>
              <div className="flex gap-3">
                <Button 
                  onClick={handleClose} 
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleImportData}
                  className="flex items-center gap-2"
                >
                  <Icons.Download size={16} />
                  Import to Asset Reports
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
