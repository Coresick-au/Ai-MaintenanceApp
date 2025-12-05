import * as pdfjsLib from 'pdfjs-dist';

// Configure the PDFJS worker for Vite/React environment
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

// Internal function to extract text from PDF
async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF: ' + error.message);
  }
}

/**
 * Parses service report data from PDF text using regex patterns
 * @param {string} text - The raw PDF text
 * @returns {Object|null} - Parsed data object or null if parsing fails
 */
export function parseServiceReportText(text) {
  try {
    const results = {};

    // Extract Service Date (multiple formats)
    // Format: YYYY.MM.DD or Service Date: DD/MM/YYYY or DD-MM-YYYY
    const dateMatch1 = text.match(/(\d{4})\.(\d{2})\.(\d{2})/);
    if (dateMatch1) {
      results.date = `${dateMatch1[1]}-${dateMatch1[2]}-${dateMatch1[3]}`;
    } else {
      const dateMatch2 = text.match(/Service Date[:\s]+(\d{1,2})[/-](\d{1,2})[/-](\d{4})/i);
      if (dateMatch2) {
        const day = dateMatch2[1].padStart(2, '0');
        const month = dateMatch2[2].padStart(2, '0');
        const year = dateMatch2[3];
        results.date = `${year}-${month}-${day}`;
      }
    }

    // Better date extraction from readable format (e.g., "Monday, 19 August 2025")
    const readableDateMatch = text.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
    if (readableDateMatch) {
      const day = readableDateMatch[1].padStart(2, '0');
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const month = (monthNames.indexOf(readableDateMatch[2]) + 1).toString().padStart(2, '0');
      const year = readableDateMatch[3];
      results.date = `${year}-${month}-${day}`;
    }

    // Extract Asset Code/Name
    const assetCodeMatch = text.match(/Asset Code\/Name[:\s]+([A-Za-z0-9\s-]+?)(?:\n|Conveyor)/i);
    if (assetCodeMatch) {
      results.assetCode = assetCodeMatch[1].trim();
    }

    // Alternative: Extract Conveyor Number
    const conveyorMatch = text.match(/Conveyor Number[:\s]+([A-Za-z0-9\s-]+?)(?:\n|$)/i);
    if (conveyorMatch) {
      results.assetCode = results.assetCode || conveyorMatch[1].trim();
    }

    // Extract Technician Names
    const tech1Match = text.match(/Technician\s+1[:\s]+([A-Za-z\s]+?)(?:\s*-|\s*\n)/i);
    if (tech1Match) {
      results.technician = tech1Match[1].trim();
    }

    const tech2Match = text.match(/Technician\s+2[:\s]+([A-Za-z\s]+?)(?:\s*-|\s*\n)/i);
    if (tech2Match && results.technician) {
      results.technician += ', ' + tech2Match[1].trim();
    } else if (tech2Match) {
      results.technician = tech2Match[1].trim();
    }

    // Extract Tare Change %
    const tareMatch = text.match(/Tare Change[:\s]+([-\d.]+)\s*%/i);
    if (tareMatch) {
      results.tareChange = tareMatch[1];
    }

    // Alternative: Extract Old/New Tare and calculate change
    const oldTareMatch = text.match(/Old Tare[:\s]+([-\d.]+)/i);
    const newTareMatch = text.match(/New Tare[:\s]+([-\d.]+)/i);
    if (oldTareMatch && newTareMatch && !results.tareChange) {
      const oldTare = parseFloat(oldTareMatch[1]);
      const newTare = parseFloat(newTareMatch[1]);
      if (oldTare !== 0) {
        results.tareChange = (((newTare - oldTare) / oldTare) * 100).toFixed(2);
      }
    }

    // Extract Span Change %
    const spanMatch = text.match(/Span Change[:\s]+([-\d.]+)\s*%/i);
    if (spanMatch) {
      results.spanChange = spanMatch[1];
    }

    // Alternative: Extract Old/New Span and calculate change
    const oldSpanMatch = text.match(/Old Span[:\s]+([-\d.]+)/i);
    const newSpanMatch = text.match(/New Span[:\s]+([-\d.]+)/i);
    if (oldSpanMatch && newSpanMatch && !results.spanChange) {
      const oldSpan = parseFloat(oldSpanMatch[1]);
      const newSpan = parseFloat(newSpanMatch[1]);
      if (oldSpan !== 0) {
        results.spanChange = (((newSpan - oldSpan) / oldSpan) * 100).toFixed(2);
      }
    }

    // Extract Belt Speed (As Left / New Belt Speed)
    const speedMatch = text.match(/(?:Belt Speed|New Belt Speed)[:\s]+[\d.]+\s*m\/s[:\s]+([\d.]+)\s*m\/s/i);
    if (speedMatch) {
      results.speed = speedMatch[1];
    }

    // Alternative: Just get any belt speed value
    const speedAltMatch = text.match(/Belt Speed[:\s]+([\d.]+)\s*m\/s/i);
    if (speedAltMatch && !results.speed) {
      results.speed = speedAltMatch[1];
    }

    // Extract Throughput (tonnage values ending with 't')
    // This regex now broadly captures any number followed by 't' from the text,
    // assuming these are the relevant tonnage values ("As Left").
    const tonnageMatch = text.match(/(\d[\d,.]*)\s*t/i);
    if (tonnageMatch) {
      results.throughput = tonnageMatch[1].replace(/,/g, ''); // Remove commas for parsing
    }

    // Extract Load Cell Zero mV (As Left)
    const zeroMVMatch = text.match(/LC mV\/V @ Zero[:\s]+[\d.]+\s*mV[:\s]+([\d.]+)\s*mV/i);
    if (zeroMVMatch) {
      results.zeroMV = zeroMVMatch[1];
    }

    // Alternative: Just get zero signal
    const zeroAltMatch = text.match(/Zero[:\s]+([\d.]+)\s*mV/i);
    if (zeroAltMatch && !results.zeroMV) {
      results.zeroMV = zeroAltMatch[1];
    }

    // Extract Load Cell Span mV (As Left)
    const spanMVMatch = text.match(/LC mV\/V @ Span[:\s]+[\d.]+\s*mV[:\s]+([\d.]+)\s*mV/i);
    if (spanMVMatch) {
      results.spanMV = spanMVMatch[1];
    }

    // Alternative: Just get span signal
    const spanAltMatch = text.match(/Span[:\s]+([\d.]+)\s*mV/i);
    if (spanAltMatch && !results.spanMV) {
      results.spanMV = spanAltMatch[1];
    }

    // Extract Comments and Recommendations
    // Improved regex to stop at common footer markers or end of section
    const commentsMatch = text.match(/Comments and Recommendations[:\s]+([\s\S]+?)(?:www\.accurateindustries|Status:|Page \d|ABN \d|$)/i);
    if (commentsMatch) {
      // Clean up the extracted text
      let rawComments = commentsMatch[1].trim();

      // Heuristic: If comments start with "1.", remove any text before it (often headers/titles)
      const listStartMatch = rawComments.match(/(?:^|\s)(1\.\s)/);
      if (listStartMatch) {
        const startIndex = listStartMatch.index + (listStartMatch[0].startsWith('1') ? 0 : 1); // Adjust for leading space if matched
        rawComments = rawComments.substring(startIndex);
      }

      // Ensure each numbered item starts on a new line (e.g. "text. 2. Next" -> "text.\n\n2. Next")
      // We look for a space (or start of line) followed by a digit, a dot, and a space.
      // We replace with double newline to ensure paragraph break.
      rawComments = rawComments.replace(/(?:\s+|^)(\d+\.\s)/g, '\n\n$1');

      // Remove any trailing "Page X of Y" or similar artifacts if they slipped through
      rawComments = rawComments.replace(/Page \d+ of \d+.*$/i, '').trim();

      // Remove trailing date if it appears at the very end (e.g. "Wednesday, 23 April 2025")
      // This often appears before the "Status:" footer
      rawComments = rawComments.replace(/\n?[A-Z][a-z]+, \d{1,2} [A-Z][a-z]+ \d{4}$/, '').trim();

      results.comments = rawComments;
    }

    // Validate that we extracted at least some critical data
    if (!results.date && !results.tareChange && !results.spanChange) {
      console.warn('PDF parsing found no critical data');
      return null;
    }

    return results;
  } catch (error) {
    console.error('PDF parsing error:', error);
    return null;
  }
}

/**
 * Main function to parse a service report PDF file
 * @param {File} file - The PDF file to parse
 * @returns {Promise<Object>} - Parsed report data
 */
export async function parseServiceReport(file) {
  try {
    // Validate file type
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('Invalid file type. Please upload a PDF file.');
    }

    // Extract text from PDF
    const text = await extractTextFromPDF(file);

    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the PDF. The file may be scanned or image-based.');
    }

    // Parse the text using regex
    const parsedData = parseServiceReportText(text);

    if (!parsedData) {
      throw new Error('Could not extract report data from PDF. Please check the format matches the expected template.');
    }

    // Return parsed data with file name
    return {
      ...parsedData,
      fileName: file.name,
      extractedText: text // Include for debugging if needed
    };

  } catch (error) {
    console.error('Error parsing service report:', error);
    throw error;
  }
}
