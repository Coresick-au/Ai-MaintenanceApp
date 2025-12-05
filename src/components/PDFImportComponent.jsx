import React, { useState, useEffect } from 'react';
import { Icons } from '../constants/icons.jsx';

// Try to import the PDF extractor - check dynamically each render
let PDFTableExtractor = null;
let dependencyError = null;

const checkPDFDependency = async () => {
  try {
    // Reset error state and try to import again
    dependencyError = null;
    
    // Import the initialization function
    const { initializePDFLib, PDFTableExtractor: Extractor } = await import('../utils/PDFTableExtractor');
    
    // Initialize the PDF library
    const initialized = await initializePDFLib();
    if (!initialized) {
      throw new Error('Failed to initialize PDF library');
    }
    
    PDFTableExtractor = Extractor;
    return true;
  } catch (error) {
    dependencyError = error.message || 'PDF extraction not available';
    console.error('PDFImportComponent: PDF extraction not available:', error.message);
    return false;
  }
};

export const PDFImportComponent = ({ onDataExtracted }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [dependencyAvailable, setDependencyAvailable] = useState(false);

  // Check for dependency on component mount and when it might change
  useEffect(() => {
    const checkDependency = async () => {
      const available = await checkPDFDependency();
      setDependencyAvailable(available);
    };
    checkDependency();
  }, []);

  // Show dependency error if pdfjs-dist is not available
  if (!dependencyAvailable) {
    return (
      <div className="p-6 bg-slate-800 rounded-lg border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">Import Calibration Report PDF</h3>
        
        <div className="bg-yellow-900/20 border border-yellow-800 text-yellow-300 px-4 py-3 rounded mb-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold">PDF Import Not Available</p>
              <p className="text-sm mt-1">The PDF import feature requires additional dependencies.</p>
              <div className="mt-2 p-2 bg-slate-900/50 rounded text-xs font-mono">
                npm install pdfjs-dist@5.4.394
              </div>
              <p className="text-sm mt-2">After installing, click "Retry" or restart your development server.</p>
            </div>
          </div>
        </div>

        <button
          onClick={async () => {
            setIsLoading(true);
            const available = await checkPDFDependency();
            setDependencyAvailable(available);
            setIsLoading(false);
          }}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Icons.Loader className="animate-spin" size={16} />
              Checking...
            </>
          ) : (
            <>
              <Icons.RotateCcw size={16} />
              Retry Dependency Check
            </>
          )}
        </button>
      </div>
    );
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a valid PDF file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert file to Uint8Array
      const arrayBuffer = await file.arrayBuffer();
      const pdfData = new Uint8Array(arrayBuffer);

      // Create extractor instance
      const extractor = new PDFTableExtractor(pdfData);

      // Extract data
      const result = await extractor.extractReportData();
      
      setExtractedData(result);
      
      // Pass data to parent component
      if (onDataExtracted) {
        onDataExtracted(result);
      }

      console.log('Extracted data:', result);
    } catch (err) {
      console.error('PDF extraction error:', err);
      setError(`Failed to extract data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-800 rounded-lg border border-slate-700">
      <h3 className="text-lg font-bold text-white mb-4">Import Calibration Report PDF</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Select PDF File
        </label>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          disabled={isLoading}
          className="block w-full text-sm text-slate-300
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-600 file:text-white
            hover:file:bg-blue-700
            file:cursor-pointer cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-slate-300">Extracting data from PDF...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {extractedData && (
        <div className="mt-6">
          <h4 className="text-md font-semibold text-white mb-3">Extracted Data Preview</h4>
          
          {/* Table Data */}
          {extractedData.tableData.length > 0 && (
            <div className="mb-6">
              <h5 className="text-sm font-medium text-slate-300 mb-2">Calibration Data ({extractedData.tableData.length} rows)</h5>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase">As Found</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase">As Left</th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-800 divide-y divide-slate-700">
                    {extractedData.tableData.map((row, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-slate-300">{row.description}</td>
                        <td className="px-4 py-2 text-sm text-slate-300">{row.asFound}</td>
                        <td className="px-4 py-2 text-sm text-slate-300">{row.asLeft}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Comments */}
          {extractedData.comments && (
            <div>
              <h5 className="text-sm font-medium text-slate-300 mb-2">Comments & Recommendations</h5>
              <div className="bg-slate-900/50 p-4 rounded border border-slate-600">
                <pre className="text-sm text-slate-300 whitespace-pre-wrap">{extractedData.comments}</pre>
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                // Copy data to clipboard
                navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2));
                alert('Data copied to clipboard!');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Copy JSON Data
            </button>
            <button
              onClick={() => setExtractedData(null)}
              className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
