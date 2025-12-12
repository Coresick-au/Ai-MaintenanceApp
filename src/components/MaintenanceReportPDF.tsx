import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

interface SiteData {
  customer: string;
  name: string;
  location: string;
  logo?: string;
  serviceData: any[];
  rollerData: any[];
}

interface MaintenanceReportPDFProps {
  site: SiteData;
  generatedDate: string;
}

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 12 }
});

export const MaintenanceReportPDF: React.FC<MaintenanceReportPDFProps> = ({ site, generatedDate }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View>
          <Text>Maintenance Report - Hello World Test</Text>
          <Text>Accessing primitive string: {site.customer}</Text>
          <Text>If you see this, the component logic was the issue.</Text>
        </View>
      </Page>
    </Document>
  );
};
