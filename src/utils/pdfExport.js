import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Load image from URL for PDF embedding
 * @param {string} url - Image URL
 * @returns {Promise<Object>} Image data with dimensions
 */
const loadImage = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            resolve({
                data: dataUrl,
                width: img.width,
                height: img.height
            });
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = url;
    });
};

/**
 * Export build guide to PDF with BOM, stock levels, and locations
 * @param {Object} product - Product details
 * @param {Object} guide - Build guide with steps
 * @param {Object} bom - Enriched BOM with parts and fasteners
 */
export const exportBuildGuideToPDF = async (product, guide, bom) => {
    try {
        // Create new PDF document
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let currentY = 20;

        // Helper to add page numbers
        const addPageNumbers = () => {
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(
                    `Page ${i} of ${pageCount}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            }
        };

        // === HEADER SECTION ===
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('Build Guide', 20, currentY);
        currentY += 10;

        // Product info
        doc.setFontSize(16);
        doc.setFont('helvetica', 'normal');
        doc.text(product.name, 20, currentY);
        currentY += 8;

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`SKU: ${product.sku}`, 20, currentY);
        currentY += 6;

        const now = new Date();
        doc.text(`Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 20, currentY);
        currentY += 15;

        // === BILL OF MATERIALS SECTION ===
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('Bill of Materials', 20, currentY);
        currentY += 8;

        // Prepare BOM table data
        const bomTableData = [];

        // Add parts
        if (bom.parts && bom.parts.length > 0) {
            bom.parts.forEach(part => {
                const stockStatus = getStockStatus(part.currentStock, part.reorderLevel);
                bomTableData.push([
                    'Part',
                    part.partNumber,
                    part.description,
                    `${part.quantityUsed} ${part.unit || ''}`,
                    part.locationName || 'No location',
                    { content: part.currentStock.toString(), styles: { textColor: stockStatus.color } }
                ]);
            });
        }

        // Add fasteners
        if (bom.fasteners && bom.fasteners.length > 0) {
            bom.fasteners.forEach(fastener => {
                const stockStatus = getStockStatus(fastener.currentStock, fastener.reorderLevel);
                bomTableData.push([
                    'Fastener',
                    fastener.partNumber,
                    fastener.description,
                    fastener.quantityUsed.toString(),
                    fastener.locationName || 'No location',
                    { content: fastener.currentStock.toString(), styles: { textColor: stockStatus.color } }
                ]);
            });
        }

        if (bomTableData.length === 0) {
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text('No BOM items for this product', 20, currentY);
            currentY += 10;
        } else {
            autoTable(doc, {
                startY: currentY,
                head: [['Type', 'SKU', 'Description', 'Qty Required', 'Location', 'Stock']],
                body: bomTableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: 255,
                    fontSize: 10,
                    fontStyle: 'bold'
                },
                bodyStyles: {
                    fontSize: 9,
                    textColor: 50
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                columnStyles: {
                    0: { cellWidth: 18 },      // Type
                    1: { cellWidth: 22 },      // SKU: Reduced from 23
                    2: { cellWidth: 50 },      // Description: Reduced from 55
                    3: { cellWidth: 20 },      // Qty: Reduced from 22
                    4: { cellWidth: 30 },      // Location: Reduced from 32
                    5: { cellWidth: 18, halign: 'right' }  // Stock
                },
                margin: { left: 20, right: 20 }
            });

            currentY = doc.lastAutoTable.finalY + 15;
        }

        // Check if we need a new page for assembly steps
        if (currentY > pageHeight - 60) {
            doc.addPage();
            currentY = 20;
        }

        // === ASSEMBLY STEPS SECTION ===
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('Assembly Instructions', 20, currentY);
        currentY += 10;

        if (guide && guide.steps && guide.steps.length > 0) {
            for (const step of guide.steps) {
                // Check if we need a new page
                if (currentY > pageHeight - 60) {
                    doc.addPage();
                    currentY = 20;
                }

                // Step number badge
                doc.setFillColor(41, 128, 185);
                doc.circle(25, currentY - 2, 5, 'F');
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255);
                doc.text(step.stepNumber.toString(), 25, currentY + 1, { align: 'center' });

                // Step instruction
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0);
                const instructionLines = doc.splitTextToSize(step.instruction, pageWidth - 50);
                doc.text(instructionLines, 35, currentY);
                currentY += instructionLines.length * 5 + 2;

                // Step notes (if present)
                if (step.notes && step.notes.trim()) {
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'italic');
                    doc.setTextColor(80);
                    const notesLines = doc.splitTextToSize(`Note: ${step.notes}`, pageWidth - 50);
                    doc.text(notesLines, 35, currentY);
                    currentY += notesLines.length * 4.5 + 2;
                }

                // Materials used (if present)
                if (step.itemsUsed && step.itemsUsed.length > 0) {
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(41, 128, 185);
                    doc.text('Materials:', 35, currentY);
                    currentY += 4.5;

                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(80);

                    step.itemsUsed.forEach(item => {
                        const itemText = `• ${item.sku}: ${item.quantityUsed} ${item.unit || ''}`;
                        doc.text(itemText, 38, currentY);
                        currentY += 4;
                    });

                    currentY += 2;
                }

                // Step image (if present)
                if (step.imageUrl) {
                    try {
                        // Load image
                        const imgData = await loadImage(step.imageUrl);

                        // Calculate dimensions (max width 140mm, maintain aspect ratio)
                        const maxWidth = 140;
                        const maxHeight = 100;
                        let imgWidth = maxWidth;
                        let imgHeight = (imgData.height / imgData.width) * maxWidth;

                        if (imgHeight > maxHeight) {
                            imgHeight = maxHeight;
                            imgWidth = (imgData.width / imgData.height) * maxHeight;
                        }

                        // Check if image fits on current page
                        if (currentY + imgHeight > pageHeight - 20) {
                            doc.addPage();
                            currentY = 20;
                        }

                        // Add image
                        doc.addImage(imgData.data, 'JPEG', 35, currentY, imgWidth, imgHeight);
                        currentY += imgHeight + 5;
                    } catch (err) {
                        console.warn(`Failed to load image for step ${step.stepNumber}:`, err);
                        // Continue without the image
                    }
                }

                currentY += 5; // Spacing between steps
            }
        } else {
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text('No assembly steps defined', 20, currentY);
        }

        // Add page numbers to all pages
        addPageNumbers();

        // Generate filename
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `BuildGuide_${product.sku}_${dateStr}.pdf`;

        // Save the PDF
        doc.save(filename);

        console.log('[PDF Export] Build guide exported successfully:', filename);
        return true;
    } catch (error) {
        console.error('[PDF Export] Error generating PDF:', error);
        throw new Error('Failed to generate PDF: ' + error.message);
    }
};

/**
 * Get stock status color based on current stock vs reorder level
 * @param {number} currentStock - Current stock quantity
 * @param {number} reorderLevel - Reorder threshold
 * @returns {Object} Status with color code
 */
const getStockStatus = (currentStock, reorderLevel) => {
    if (currentStock === 0) {
        return { status: 'out', color: [220, 53, 69] }; // Red
    } else if (currentStock <= reorderLevel) {
        return { status: 'low', color: [255, 193, 7] }; // Amber
    } else if (currentStock <= reorderLevel * 1.5) {
        return { status: 'medium', color: [255, 152, 0] }; // Orange
    } else {
        return { status: 'good', color: [40, 167, 69] }; // Green
    }
};
