/**
 * PDF Export Utility for Timesheets
 * 
 * Generates professional PDF reports for weekly timesheets.
 * 
 * FIREBASE ADAPTATION: Works with Firebase data structures.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { TimesheetEntry, WeeklySummary } from '../types';
import { calculateEntry } from './calculator';
import { getWeekEnd, getISOWeekNumber, getISOWeekYear, formatDateRange } from './weekUtils';

interface ExportOptions {
    entries: TimesheetEntry[];
    summary: WeeklySummary;
    weekStart: Date;
    techName?: string;
}

/**
 * Export timesheet to PDF
 */
export async function exportTimesheetToPDF(options: ExportOptions): Promise<void> {
    const { entries, summary, weekStart, techName = 'Technician' } = options;

    const weekEnd = getWeekEnd(weekStart);
    const weekNumber = getISOWeekNumber(weekStart);
    const weekYear = getISOWeekYear(weekStart);
    const dateRange = formatDateRange(weekStart, weekEnd);

    // Create PDF
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Technician Timesheet', margin, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Week ${weekNumber}, ${weekYear} • ${dateRange}`, margin, 28);
    doc.text(`Technician: ${techName}`, margin, 35);

    // Summary Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Weekly Summary', margin, 48);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const summaryData = [
        ['Total Hours', `${summary.totalNetHours.toFixed(2)}h`],
        ['Base Hours (1.0x)', `${summary.totalBaseHours.toFixed(2)}h`],
        ['OT Hours (1.5x)', `${summary.totalOT15x.toFixed(2)}h`],
        ['OT Hours (2.0x)', `${summary.totalOT20x.toFixed(2)}h`],
        ['Chargeable Hours', `${summary.totalChargeableHours.toFixed(2)}h`],
        ['Per Diem', `$${summary.totalPerDiem.toFixed(2)}`],
        ['Utilization', `${summary.utilizationPercent.toFixed(1)}%`],
    ];

    autoTable(doc, {
        startY: 52,
        head: [],
        body: summaryData,
        theme: 'plain',
        margin: { left: margin },
        columnStyles: {
            0: { cellWidth: 40, fontStyle: 'bold' },
            1: { cellWidth: 30 },
        },
        styles: {
            fontSize: 9,
            cellPadding: 2,
        },
    });

    // Entries Table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Timesheet Entries', margin, 100);

    // Prepare entries data
    const entriesData = entries.map(entry => {
        const calc = calculateEntry(entry);
        return [
            entry.day,
            entry.startTime,
            entry.finishTime,
            `${entry.breakDuration}h`,
            entry.activity,
            entry.jobNo || '-',
            entry.isNightshift ? 'Yes' : '-',
            entry.isOvernight ? 'Yes' : '-',
            `${calc.netHours.toFixed(2)}h`,
            calc.perDiem > 0 ? `$${calc.perDiem.toFixed(2)}` : '-',
        ];
    });

    autoTable(doc, {
        startY: 105,
        head: [['Day', 'Start', 'Finish', 'Break', 'Activity', 'Job #', 'Night', 'O/N', 'Hours', 'Per Diem']],
        body: entriesData,
        theme: 'striped',
        margin: { left: margin, right: margin },
        headStyles: {
            fillColor: [51, 65, 85], // slate-700
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
        },
        styles: {
            fontSize: 8,
            cellPadding: 2,
        },
        columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 18 },
            2: { cellWidth: 18 },
            3: { cellWidth: 15 },
            4: { cellWidth: 22 },
            5: { cellWidth: 25 },
            6: { cellWidth: 15 },
            7: { cellWidth: 15 },
            8: { cellWidth: 20 },
            9: { cellWidth: 22 },
        },
    });

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
        `Generated on ${new Date().toLocaleDateString('en-AU')} at ${new Date().toLocaleTimeString('en-AU')}`,
        margin,
        pageHeight - 10
    );

    // Generate filename
    const dateStr = weekStart.toISOString().split('T')[0];
    const filename = `${weekYear}-W${weekNumber.toString().padStart(2, '0')}-${techName.toUpperCase().replace(/\s/g, '_')}-TIMESHEET.pdf`;

    // Save
    doc.save(filename);
}
