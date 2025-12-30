/**
 * CSV Export/Import Utility
 * Handles CSV operations for historical data backup and restore
 */
import Papa from 'papaparse';

/**
 * Export data to CSV and trigger download
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the CSV file
 */
export const exportToCSV = (data, filename) => {
    try {
        if (!data || data.length === 0) {
            throw new Error('No data to export');
        }

        // Convert data to CSV using Papa Parse
        const csv = Papa.unparse(data, {
            quotes: true,
            header: true
        });

        // Create blob and download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`[CSV Export] Successfully exported ${data.length} records to ${filename}`);
        return true;
    } catch (error) {
        console.error('[CSV Export] Error exporting to CSV:', error);
        throw new Error(`Failed to export CSV: ${error.message}`);
    }
};

/**
 * Parse CSV file and return array of objects
 * @param {File} file - CSV file to parse
 * @returns {Promise<Array>} Parsed data
 */
export const importFromCSV = (file) => {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('No file provided'));
            return;
        }

        if (!file.name.endsWith('.csv')) {
            reject(new Error('File must be a CSV (.csv)'));
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true, // Auto-convert numbers and booleans
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.warn('[CSV Import] Parse warnings:', results.errors);
                }

                console.log(`[CSV Import] Successfully parsed ${results.data.length} records`);
                resolve(results.data);
            },
            error: (error) => {
                console.error('[CSV Import] Parse error:', error);
                reject(new Error(`Failed to parse CSV: ${error.message}`));
            }
        });
    });
};

/**
 * Validate imported data structure
 * @param {Array} data - Data to validate
 * @param {Array<string>} requiredFields - Required field names
 * @returns {Object} Validation result with success flag and errors
 */
export const validateImportData = (data, requiredFields) => {
    const errors = [];

    if (!Array.isArray(data) || data.length === 0) {
        errors.push('CSV file is empty or invalid');
        return { success: false, errors };
    }

    // Check if all required fields exist in the first row
    const firstRow = data[0];
    const missingFields = requiredFields.filter(field => !(field in firstRow));

    if (missingFields.length > 0) {
        errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate each row
    data.forEach((row, index) => {
        requiredFields.forEach(field => {
            if (row[field] === null || row[field] === undefined || row[field] === '') {
                errors.push(`Row ${index + 1}: Missing value for "${field}"`);
            }
        });
    });

    return {
        success: errors.length === 0,
        errors,
        validRecords: errors.length === 0 ? data.length : 0
    };
};

/**
 * Prepare data for export by ensuring consistent field order and formatting
 * @param {Array} data - Data to prepare
 * @param {Array<string>} fieldOrder - Desired field order (optional)
 * @returns {Array} Prepared data
 */
export const prepareForExport = (data, fieldOrder = null) => {
    if (!data || data.length === 0) return [];

    // If no field order specified, use keys from first object
    const fields = fieldOrder || Object.keys(data[0]);

    // Reorder each object's keys
    return data.map(item => {
        const ordered = {};
        fields.forEach(field => {
            ordered[field] = item[field] !== undefined ? item[field] : '';
        });
        return ordered;
    });
};
