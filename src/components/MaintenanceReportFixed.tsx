import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Exact styles from JobSheetPDF
const styles = StyleSheet.create({
    page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica', color: '#1F2937' },
    header: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 10 },
    title: { fontSize: 24, color: '#111827' },
    subTitle: { fontSize: 12, color: '#6B7280' },
});

interface MaintenanceReportFixedProps {
    site: any;
    generatedDate: string;
    debug?: boolean;
}

export const MaintenanceReportFixed: React.FC<MaintenanceReportFixedProps> = ({ site, generatedDate, debug = false }) => {
    return (
        <Document>
            <Page size="A4" style={styles.page} debug={debug}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>MAINTENANCE REPORT</Text>
                        <Text style={styles.subTitle}>Accurate Industries (Cloned from JobSheet)</Text>
                        <Text style={styles.subTitle}>Date: {generatedDate}</Text>
                    </View>
                </View>
                <View>
                    <Text>Site: {site?.customer || 'Unknown'}</Text>
                </View>
            </Page>
        </Document>
    );
};
