/**
 * AdminTimesheetPDF - PDF Export for Admin Dashboard
 * 
 * Generates a formatted PDF report of all staff timesheets for a week
 */

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Define types for props
interface StaffSummary {
    userId: string;
    userName: string;
    userEmail: string;
    summary: {
        totalNetHours: number;
        totalBaseHours: number;
        totalOT15x: number;
        totalOT20x: number;
        totalPerDiem: number;
    };
    isLocked: boolean;
}

interface GrandTotals {
    totalNetHours: number;
    totalBaseHours: number;
    totalOT15x: number;
    totalOT20x: number;
    totalPerDiem: number;
    staffCount: number;
}

interface AdminTimesheetPDFProps {
    staffSummaries: StaffSummary[];
    grandTotals: GrandTotals;
    weekStart: Date;
    weekEnd: Date;
    weekKey: string;
}

// Styles for light mode (optimized for printing)
const styles = StyleSheet.create({
    page: {
        padding: 40,
        backgroundColor: '#ffffff',
        color: '#1f2937',
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 30,
        borderBottom: '3 solid #3b82f6',
        paddingBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1e40af',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: 'normal',
    },
    summarySection: {
        marginBottom: 30,
        padding: 20,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        border: '1 solid #d1d5db',
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 15,
    },
    summaryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
    },
    summaryCard: {
        flex: 1,
        padding: 12,
        backgroundColor: '#ffffff',
        borderRadius: 6,
        border: '1 solid #e5e7eb',
    },
    summaryLabel: {
        fontSize: 10,
        color: '#6b7280',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    table: {
        marginTop: 10,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#1e40af',
        padding: 12,
        borderRadius: 4,
        marginBottom: 2,
    },
    tableHeaderText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        padding: 10,
        borderBottom: '1 solid #e5e7eb',
        backgroundColor: '#ffffff',
    },
    tableRowAlt: {
        backgroundColor: '#f9fafb',
    },
    tableFooter: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#dbeafe',
        borderRadius: 4,
        marginTop: 2,
        border: '1 solid #93c5fd',
    },
    tableFooterText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1e40af',
    },
    col1: { width: '25%', paddingRight: 8 },
    col2: { width: '12.5%', textAlign: 'right', paddingRight: 8 },
    col3: { width: '12.5%', textAlign: 'right', paddingRight: 8 },
    col4: { width: '12.5%', textAlign: 'right', paddingRight: 8 },
    col5: { width: '12.5%', textAlign: 'right', paddingRight: 8 },
    col6: { width: '12.5%', textAlign: 'right', paddingRight: 8 },
    col7: { width: '12.5%', textAlign: 'center' },
    cellText: {
        fontSize: 10,
        color: '#374151',
    },
    cellTextBold: {
        fontSize: 10,
        color: '#1f2937',
        fontWeight: 'bold',
    },
    cellName: {
        fontSize: 11,
        color: '#1f2937',
        fontWeight: 'bold',
        marginBottom: 2,
    },
    statusLocked: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#047857',
        backgroundColor: '#d1fae5',
        padding: '4 8',
        borderRadius: 4,
        border: '1 solid #10b981',
    },
    statusDraft: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#d97706',
        backgroundColor: '#fef3c7',
        padding: '4 8',
        borderRadius: 4,
        border: '1 solid #f59e0b',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontSize: 9,
        color: '#9ca3af',
        borderTop: '1 solid #e5e7eb',
        paddingTop: 10,
    },
});

export function AdminTimesheetPDF({
    staffSummaries,
    grandTotals,
    weekStart,
    weekEnd,
    weekKey
}: AdminTimesheetPDFProps) {
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-AU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <Document>
            <Page size="A4" orientation="landscape" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Timesheet Admin Report</Text>
                    <Text style={styles.subtitle}>
                        Week {weekKey} • {formatDate(weekStart)} - {formatDate(weekEnd)}
                    </Text>
                </View>

                {/* Summary Section */}
                <View style={styles.summarySection}>
                    <Text style={styles.summaryTitle}>Week Summary</Text>
                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>Staff Members</Text>
                            <Text style={styles.summaryValue}>{grandTotals.staffCount}</Text>
                        </View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>Total Hours</Text>
                            <Text style={styles.summaryValue}>{grandTotals.totalNetHours.toFixed(1)}</Text>
                        </View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>Average Hours</Text>
                            <Text style={styles.summaryValue}>
                                {grandTotals.staffCount > 0
                                    ? (grandTotals.totalNetHours / grandTotals.staffCount).toFixed(1)
                                    : '0.0'
                                }
                            </Text>
                        </View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>Total Overtime</Text>
                            <Text style={styles.summaryValue}>
                                {(grandTotals.totalOT15x + grandTotals.totalOT20x).toFixed(1)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Staff Table */}
                <View style={styles.table}>
                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, styles.col1]}>Staff Member</Text>
                        <Text style={[styles.tableHeaderText, styles.col2]}>Total Hours</Text>
                        <Text style={[styles.tableHeaderText, styles.col3]}>Base</Text>
                        <Text style={[styles.tableHeaderText, styles.col4]}>OT 1.5x</Text>
                        <Text style={[styles.tableHeaderText, styles.col5]}>OT 2x</Text>
                        <Text style={[styles.tableHeaderText, styles.col6]}>Per Diem</Text>
                        <Text style={[styles.tableHeaderText, styles.col7]}>Status</Text>
                    </View>

                    {/* Table Rows */}
                    {staffSummaries.map((staff, index) => (
                        <View
                            key={staff.userId}
                            style={[
                                styles.tableRow,
                                ...(index % 2 === 1 ? [styles.tableRowAlt] : [])
                            ]}
                        >
                            <View style={styles.col1}>
                                <Text style={styles.cellName}>{staff.userName}</Text>
                            </View>
                            <Text style={[styles.cellTextBold, styles.col2]}>
                                {staff.summary.totalNetHours.toFixed(1)}
                            </Text>
                            <Text style={[styles.cellText, styles.col3]}>
                                {staff.summary.totalBaseHours.toFixed(1)}
                            </Text>
                            <Text style={[styles.cellText, styles.col4]}>
                                {staff.summary.totalOT15x.toFixed(1)}
                            </Text>
                            <Text style={[styles.cellText, styles.col5]}>
                                {staff.summary.totalOT20x.toFixed(1)}
                            </Text>
                            <Text style={[styles.cellText, styles.col6]}>
                                ${staff.summary.totalPerDiem.toFixed(2)}
                            </Text>
                            <View style={styles.col7}>
                                <Text style={staff.isLocked ? styles.statusLocked : styles.statusDraft}>
                                    {staff.isLocked ? 'LOCKED' : 'DRAFT'}
                                </Text>
                            </View>
                        </View>
                    ))}

                    {/* Table Footer */}
                    <View style={styles.tableFooter}>
                        <Text style={[styles.tableFooterText, styles.col1]}>
                            Total ({grandTotals.staffCount} staff)
                        </Text>
                        <Text style={[styles.tableFooterText, styles.col2]}>
                            {grandTotals.totalNetHours.toFixed(1)}
                        </Text>
                        <Text style={[styles.tableFooterText, styles.col3]}>
                            {grandTotals.totalBaseHours.toFixed(1)}
                        </Text>
                        <Text style={[styles.tableFooterText, styles.col4]}>
                            {grandTotals.totalOT15x.toFixed(1)}
                        </Text>
                        <Text style={[styles.tableFooterText, styles.col5]}>
                            {grandTotals.totalOT20x.toFixed(1)}
                        </Text>
                        <Text style={[styles.tableFooterText, styles.col6]}>
                            ${grandTotals.totalPerDiem.toFixed(2)}
                        </Text>
                        <Text style={[styles.tableFooterText, styles.col7]}></Text>
                    </View>
                </View>

                {/* Footer */}
                <Text style={styles.footer}>
                    Generated {new Date().toLocaleString('en-AU')} • Accurate Industries Timesheet System
                </Text>
            </Page>
        </Document>
    );
}
