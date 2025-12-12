import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Quote } from '../types';

// Clean, professional styles for job sheet
const styles = StyleSheet.create({
    page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica', color: '#1F2937' },
    header: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 10 },
    logo: { width: 60, height: 60, marginRight: 15 },
    headerText: { flexDirection: 'column', justifyContent: 'center' },
    title: { fontSize: 24, color: '#111827' },
    subTitle: { fontSize: 12, color: '#6B7280' },

    section: { marginBottom: 15 },
    sectionTitle: { fontSize: 12, backgroundColor: '#F3F4F6', padding: 5, marginBottom: 5, color: '#374151' },

    // Grid for Job Details
    grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
    gridItem: { width: '50%', marginBottom: 5 },
    label: { fontSize: 8, color: '#6B7280', textTransform: 'uppercase' },
    value: { fontSize: 10 },

    // Content Boxes
    contentBox: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 4, padding: 8, minHeight: 60 },

    // Table
    table: { width: '100%', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingVertical: 6, alignItems: 'center' },
    tableHeader: { backgroundColor: '#F9FAFB' },
    colDate: { width: '20%' },
    colTime: { width: '20%' },
    colTech: { width: '25%' },
    colType: { width: '35%' },

    // Footer
    footer: { position: 'absolute', bottom: 30, left: 30, right: 30, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
    footerText: { fontSize: 8, color: '#9CA3AF' }
});

interface JobSheetPDFProps {
    quote: Quote;
}

export const JobSheetPDF: React.FC<JobSheetPDFProps> = ({ quote }) => {
    const { jobDetails, shifts } = quote;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>JOB SHEET</Text>
                        <Text style={styles.subTitle}>Accurate Industries</Text>
                    </View>
                </View>

                {/* Job Information */}
                <View style={styles.section}>
                    <View style={styles.grid}>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Customer</Text>
                            <Text style={styles.value}>{jobDetails.customer || 'N/A'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Job Number</Text>
                            <Text style={styles.value}>{jobDetails.jobNo || 'Pending'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Site Location</Text>
                            <Text style={styles.value}>{jobDetails.location || 'N/A'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Date Generated</Text>
                            <Text style={styles.value}>{new Date().toLocaleDateString('en-AU')}</Text>
                        </View>
                    </View>
                </View>

                {/* Scope of Works */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SCOPE OF WORKS</Text>
                    <View style={styles.contentBox}>
                        <Text>{jobDetails.description || 'No description provided.'}</Text>
                    </View>
                </View>

                {/* Technician Notes (New Feature) */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: '#B91C1C', backgroundColor: '#FEF2F2' }]}>
                        TECHNICIAN NOTES & SAFETY
                    </Text>
                    <View style={[styles.contentBox, { borderColor: '#FECACA' }]}>
                        <Text>{jobDetails.techNotes || 'No specific notes.'}</Text>
                    </View>
                </View>

                {/* Schedule */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SCHEDULED SHIFTS</Text>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <Text style={[styles.colDate, { paddingLeft: 5 }]}>Date</Text>
                            <Text style={styles.colTime}>Time</Text>
                            <Text style={styles.colTech}>Technician</Text>
                            <Text style={styles.colType}>Type/Notes</Text>
                        </View>
                        {shifts.map((shift, i) => (
                            <View key={i} style={styles.tableRow}>
                                <Text style={[styles.colDate, { paddingLeft: 5 }]}>
                                    {new Date(shift.date).toLocaleDateString('en-AU', { weekday: 'short', day: '2-digit', month: 'short' })}
                                </Text>
                                <Text style={styles.colTime}>{shift.startTime} - {shift.finishTime}</Text>
                                <Text style={styles.colTech}>{shift.tech}</Text>
                                <Text style={styles.colType}>
                                    {shift.dayType === 'weekday' ? 'Standard' : shift.dayType.toUpperCase()}
                                    {shift.isNightShift ? ' (Night)' : ''}
                                    {shift.vehicle ? ' + Vehicle' : ''}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Sign Off Area */}
                <View style={{ marginTop: 40, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ width: '45%', borderTopWidth: 1, borderTopColor: '#000', paddingTop: 5 }}>
                        <Text style={styles.label}>Technician Signature</Text>
                    </View>
                    <View style={{ width: '45%', borderTopWidth: 1, borderTopColor: '#000', paddingTop: 5 }}>
                        <Text style={styles.label}>Site Contact Signature</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Page 1 of 1</Text>
                    <Text style={styles.footerText}>Internal Use Only - Accurate Industries</Text>
                </View>
            </Page>
        </Document>
    );
};
