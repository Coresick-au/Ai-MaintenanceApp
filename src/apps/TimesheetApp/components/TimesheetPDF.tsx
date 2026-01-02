/**
 * TimesheetPDF Component
 * 
 * Generates a professional PDF export of a week's timesheet data.
 * Includes summary statistics, daily breakdown, and notes.
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { TimesheetEntry, DayOfWeek, WeeklySummary } from '../types';
import { DAYS_OF_WEEK } from '../types';

interface TimesheetPDFProps {
    entries: TimesheetEntry[];
    summary: WeeklySummary;
    weekStart: Date;
    weekEnd: Date;
    employeeName: string;
}

// Print-friendly color palette
const colors = {
    pageBg: '#ffffff',
    cardBg: '#f9fafb',
    borderColor: '#d1d5db',
    textPrimary: '#000000',
    textSecondary: '#374151',
    textMuted: '#6b7280',
    accent: '#0891b2',
    success: '#16a34a',
    warning: '#d97706',
};

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: colors.pageBg,
        padding: 30,
        fontSize: 10,
        lineHeight: 1.5,
    },
    header: {
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 3,
    },
    dateRange: {
        fontSize: 10,
        color: colors.textMuted,
    },
    // Summary section
    summaryContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    summaryBox: {
        flex: 1,
        padding: 10,
        backgroundColor: colors.cardBg,
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderRadius: 4,
        marginRight: 8,
    },
    summaryBoxLast: {
        marginRight: 0,
    },
    summaryLabel: {
        fontSize: 8,
        color: colors.textMuted,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    summaryValueHighlight: {
        color: colors.accent,
    },
    // Day sections
    daySection: {
        marginBottom: 15,
    },
    dayHeader: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.textPrimary,
        backgroundColor: colors.cardBg,
        padding: 6,
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: colors.cardBg,
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: colors.borderColor,
        paddingVertical: 4,
    },
    tableRow: {
        flexDirection: 'row',
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: colors.borderColor,
        paddingVertical: 4,
    },
    tableCell: {
        paddingHorizontal: 4,
        fontSize: 8,
        color: colors.textSecondary,
    },
    tableCellHeader: {
        paddingHorizontal: 4,
        fontSize: 8,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    notesRow: {
        flexDirection: 'row',
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: colors.borderColor,
        backgroundColor: '#fefce8',
        paddingVertical: 3,
        paddingHorizontal: 6,
    },
    notesLabel: {
        fontSize: 7,
        color: colors.warning,
        fontWeight: 'bold',
        marginRight: 4,
    },
    notesText: {
        fontSize: 7,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    // Column widths - adjusted to prevent text wrapping
    colTime: { width: 42 },
    colBreak: { width: 32 },
    colActivity: { width: 48 },
    colJob: { width: 50 },
    colNight: { width: 35 },
    colPerDiem: { width: 45 },
    colHours: { width: 38 },
    colAllowance: { width: 55 },
    // Footer
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        fontSize: 8,
        color: colors.textMuted,
        borderTopWidth: 1,
        borderTopColor: colors.borderColor,
        paddingTop: 10,
        textAlign: 'center',
    },
    // Empty day message
    emptyDay: {
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: colors.borderColor,
        padding: 8,
        borderBottomLeftRadius: 4,
        borderBottomRightRadius: 4,
    },
    emptyDayText: {
        fontSize: 8,
        color: colors.textMuted,
        fontStyle: 'italic',
        textAlign: 'center',
    },
});

// Format time for display
const formatTime = (time: string) => {
    if (!time) return '-';
    return time;
};

// Format date for display
const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

export const TimesheetPDF: React.FC<TimesheetPDFProps> = ({
    entries,
    summary,
    weekStart,
    weekEnd,
    employeeName,
}) => {
    // Group entries by day
    const entriesByDay = DAYS_OF_WEEK.reduce((acc, day) => {
        acc[day] = entries.filter(e => e.day === day);
        return acc;
    }, {} as Record<DayOfWeek, TimesheetEntry[]>);

    const generatedDate = new Date().toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>WEEKLY TIMESHEET</Text>
                    <Text style={styles.subtitle}>{employeeName}</Text>
                    <Text style={styles.dateRange}>
                        {formatDate(weekStart)} - {formatDate(weekEnd)}
                    </Text>
                </View>

                {/* Summary Section */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Total Actual Hours</Text>
                        <Text style={styles.summaryValue}>{summary.totalNetHours.toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Total Per Diem</Text>
                        <Text style={[styles.summaryValue, styles.summaryValueHighlight]}>
                            ${summary.totalPerDiem.toFixed(2)}
                        </Text>
                    </View>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Utilisation</Text>
                        <Text style={styles.summaryValue}>
                            {summary.utilizationPercent.toFixed(0)}%
                        </Text>
                    </View>
                    <View style={[styles.summaryBox, styles.summaryBoxLast]}>
                        <Text style={styles.summaryLabel}>Chargeable Hours</Text>
                        <Text style={styles.summaryValue}>{summary.totalChargeableHours.toFixed(2)}</Text>
                    </View>
                </View>

                {/* Additional Stats Row */}
                <View style={[styles.summaryContainer, { marginTop: -10 }]}>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Hours at Base Rate</Text>
                        <Text style={styles.summaryValue}>{summary.totalBaseHours.toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Hours at O/T 1.5x</Text>
                        <Text style={styles.summaryValue}>{summary.totalOT15x.toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Hours at O/T 2x</Text>
                        <Text style={styles.summaryValue}>{summary.totalOT20x.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.summaryBox, styles.summaryBoxLast]}>
                        <Text style={styles.summaryLabel}>Equivalent Normal Hours</Text>
                        <Text style={[styles.summaryValue, styles.summaryValueHighlight]}>
                            {(summary.totalBaseHours + (summary.totalOT15x * 1.5) + (summary.totalOT20x * 2)).toFixed(2)}
                        </Text>
                    </View>
                </View>

                {/* Daily Breakdown */}
                {DAYS_OF_WEEK.map((day) => {
                    const dayEntries = entriesByDay[day];

                    return (
                        <View key={day} style={styles.daySection} wrap={false}>
                            <Text style={styles.dayHeader}>{day}</Text>

                            {dayEntries.length > 0 ? (
                                <>
                                    {/* Table Header */}
                                    <View style={styles.tableHeader}>
                                        <Text style={[styles.tableCellHeader, styles.colTime]}>Start</Text>
                                        <Text style={[styles.tableCellHeader, styles.colTime]}>Finish</Text>
                                        <Text style={[styles.tableCellHeader, styles.colBreak]}>Break</Text>
                                        <Text style={[styles.tableCellHeader, styles.colActivity]}>Activity</Text>
                                        <Text style={[styles.tableCellHeader, styles.colJob]}>Job #</Text>
                                        <Text style={[styles.tableCellHeader, styles.colNight]}>Night</Text>
                                        <Text style={[styles.tableCellHeader, styles.colPerDiem]}>Per Diem</Text>
                                        <Text style={[styles.tableCellHeader, styles.colHours]}>Hours</Text>
                                        <Text style={[styles.tableCellHeader, styles.colAllowance]}>Allowance</Text>
                                    </View>

                                    {/* Table Rows */}
                                    {dayEntries.map((entry) => (
                                        <React.Fragment key={entry.id}>
                                            <View style={styles.tableRow}>
                                                <Text style={[styles.tableCell, styles.colTime]}>
                                                    {formatTime(entry.startTime)}
                                                </Text>
                                                <Text style={[styles.tableCell, styles.colTime]}>
                                                    {formatTime(entry.finishTime)}
                                                </Text>
                                                <Text style={[styles.tableCell, styles.colBreak]}>
                                                    {entry.breakDuration}h
                                                </Text>
                                                <Text style={[styles.tableCell, styles.colActivity]}>
                                                    {entry.activity}
                                                </Text>
                                                <Text style={[styles.tableCell, styles.colJob]}>
                                                    {entry.jobNo || '-'}
                                                </Text>
                                                <Text style={[styles.tableCell, styles.colNight]}>
                                                    {entry.isNightshift ? 'Yes' : 'No'}
                                                </Text>
                                                <Text style={[styles.tableCell, styles.colPerDiem]}>
                                                    {entry.perDiemType === 'full' ? 'Full' : entry.perDiemType === 'half' ? 'Half' : '-'}
                                                </Text>
                                                <Text style={[styles.tableCell, styles.colHours]}>
                                                    {/* Calculate net hours inline */}
                                                    {(() => {
                                                        const start = entry.startTime.split(':').map(Number);
                                                        const end = entry.finishTime.split(':').map(Number);
                                                        if (start.length === 2 && end.length === 2) {
                                                            let hours = (end[0] + end[1] / 60) - (start[0] + start[1] / 60);
                                                            if (hours < 0) hours += 24;
                                                            hours -= entry.breakDuration;
                                                            return hours.toFixed(2);
                                                        }
                                                        return '-';
                                                    })()}h
                                                </Text>
                                                <Text style={[styles.tableCell, styles.colAllowance]}>
                                                    {entry.perDiemType === 'full' ? '$85.00' : entry.perDiemType === 'half' ? '$42.50' : '-'}
                                                </Text>
                                            </View>
                                            {/* Notes row if present */}
                                            {entry.notes && (
                                                <View style={styles.notesRow}>
                                                    <Text style={styles.notesLabel}>Note:</Text>
                                                    <Text style={styles.notesText}>{entry.notes}</Text>
                                                </View>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </>
                            ) : (
                                <View style={styles.emptyDay}>
                                    <Text style={styles.emptyDayText}>No entries</Text>
                                </View>
                            )}
                        </View>
                    );
                })}

                {/* Footer */}
                <Text style={styles.footer}>
                    Generated by AI Maintenance App - Weekly Timesheet - {generatedDate}
                </Text>
            </Page>
        </Document>
    );
};
