// Example of how to integrate PDF import functionality into your maintenance app
// This file demonstrates the usage patterns and data handling

import { PDFImportModal } from '../components/PDFImportModal';

/*
// Example usage in your main App component:
export default function App() {
  // ... existing state
  const [isPDFImportModalOpen, setIsPDFImportModalOpen] = useState(false);

  // Handle imported calibration data
  const handleImportCalibrationData = (extractedData) => {
    console.log('Imported calibration data:', extractedData);
    
    // Example: Process the extracted data and save to asset
    extractedData.tableData.forEach((row) => {
      // Create calibration record from extracted data
      const calibrationRecord = {
        id: `cal-${Date.now()}`,
        date: new Date().toISOString(),
        technician: 'Imported from PDF', // Could be extracted from PDF
        description: row.description,
        asFound: row.asFound,
        asLeft: row.asLeft,
        change: row.change || calculateChange(row.asFound, row.asLeft),
        assetId: selectedAsset?.id,
        timestamp: new Date().toISOString()
      };

      // Add to asset's calibration data
      if (selectedAsset) {
        handleAddCalibrationData(selectedAsset.id, calibrationRecord);
      }
    });

    // Handle comments if present
    if (extractedData.comments) {
      const note = {
        id: `note-${Date.now()}`,
        content: `Imported from PDF:\n${extractedData.comments}`,
        author: 'PDF Import',
        timestamp: new Date().toISOString()
      };
      
      // Add as note to the asset
      if (selectedAsset) {
        handleAddAssetNote(selectedAsset.id, note);
      }
    }

    // Show success message
    alert(`Successfully imported ${extractedData.tableData.length} calibration records!`);
  };

  // Add button to open PDF import modal
  const renderPDFImportButton = () => (
    <button
      onClick={() => setIsPDFImportModalOpen(true)}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
    >
      <Icons.FileText size={16} />
      Import Calibration PDF
    </button>
  );

  // Add modal to your JSX
  return (
    <div>
      {renderPDFImportButton()}
      
      <PDFImportModal
        isOpen={isPDFImportModalOpen}
        onClose={() => setIsPDFImportModalOpen(false)}
        onImportCalibrationData={handleImportCalibrationData}
      />
    </div>
  );
}
*/

// Helper function to calculate change between asFound and asLeft values
export const calculateChange = (asFound, asLeft) => {
  // Extract numeric values from strings like "1200 t/h" or "1200"
  const extractNumber = (str) => {
    const match = str.match(/[-+]?\d*\.?\d+/);
    return match ? parseFloat(match[0]) : null;
  };

  const foundValue = extractNumber(asFound);
  const leftValue = extractNumber(asLeft);

  if (foundValue === null || leftValue === null) {
    return 'N/A';
  }

  const change = leftValue - foundValue;
  const percentChange = foundValue !== 0 ? (change / foundValue * 100).toFixed(2) : 'N/A';

  return `${change > 0 ? '+' : ''}${change.toFixed(2)} (${percentChange}%)`;
};

// Example data structure for calibration record
export const createCalibrationRecord = (extractedRow, assetId, technician = 'Imported') => {
  return {
    id: `cal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    date: new Date().toISOString(),
    technician,
    assetId,
    description: extractedRow.description,
    asFound: extractedRow.asFound,
    asLeft: extractedRow.asLeft,
    change: calculateChange(extractedRow.asFound, extractedRow.asLeft),
    timestamp: new Date().toISOString(),
    source: 'pdf_import' // Track data source
  };
};

// Example of how to validate extracted data
export const validateCalibrationData = (extractedData) => {
  const errors = [];
  const warnings = [];

  if (!extractedData.tableData || extractedData.tableData.length === 0) {
    errors.push('No calibration data found in PDF');
  }

  extractedData.tableData.forEach((row, index) => {
    if (!row.description.trim()) {
      warnings.push(`Row ${index + 1}: Missing description`);
    }
    
    if (!row.asFound.trim() && !row.asLeft.trim()) {
      warnings.push(`Row ${index + 1}: No calibration values found`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recordCount: extractedData.tableData?.length || 0
  };
};
