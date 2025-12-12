import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Exact styles from JobSheetPDF to ensure no style-related crashes
const styles = StyleSheet.create({
    page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica', color: '#1F2937' },
    header: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 10 },
    title: { fontSize: 24, color: '#111827' },
    subTitle: { fontSize: 12, color: '#6B7280' },
});

// Minimal Props, similar to JobSheetPDF
interface ServiceReportFixedProps {
    data: any;
    debug?: boolean;
}

export const ServiceReportFixed: React.FC<ServiceReportFixedProps> = ({ data, debug = false }) => {
    return (
        <Document>
            <Page size="A4" style={styles.page} debug={debug}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>SERVICE REPORT</Text>
                        <Text style={styles.subTitle}>Accurate Industries (Cloned from JobSheet)</Text>
                    </View>
                </View>
                <View>
                    <Text>If this renders, the crash was in the other file's structure.</Text>
                </View>
            </Page>
        </Document>
    );
};
