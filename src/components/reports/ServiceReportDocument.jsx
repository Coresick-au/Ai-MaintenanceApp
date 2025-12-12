import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: { padding: 30, fontSize: 12 }
});

export const ServiceReportDocument = ({ data }) => {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View>
                    <Text>Service Report - Hello World Test</Text>
                    <Text>If you can read this, the crash is in the specific component logic.</Text>
                </View>
            </Page>
        </Document>
    );
};
