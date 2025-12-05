import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Asset interface for TypeScript
interface Asset {
  name: string;
  code: string;
  lastCal: string;
  dueDate: string;
  remaining: number;
  opStatus?: string;
  active?: boolean;
}

// Register font (optional - you can use system fonts)
Font.register({
  family: 'Helvetica',
  src: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontSize: 10,
    lineHeight: 1.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: 15,
  },
  titleContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 15,
    fontWeight: 'bold',
    color: '#374151',
  },
  section: {
    marginBottom: 15,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderBottomStyle: 'solid',
    paddingBottom: 5,
    marginBottom: 5,
    fontWeight: 'bold',
    backgroundColor: '#F9FAFB',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
    borderBottomStyle: 'solid',
    paddingVertical: 3,
  },
  cell: {
    flex: 1,
    paddingHorizontal: 5,
    fontSize: 9,
  },
  headerCell: {
    flex: 1,
    paddingHorizontal: 5,
    fontSize: 9,
    fontWeight: 'bold',
  },
  statusCritical: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
  statusWarning: {
    color: '#D97706',
    fontWeight: 'bold',
  },
  statusGood: {
    color: '#059669',
    fontWeight: 'bold',
  },
  summaryBox: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  summaryText: {
    fontSize: 10,
    marginBottom: 3,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 8,
    color: '#6B7280',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderTopStyle: 'solid',
    paddingTop: 10,
    textAlign: 'center',
  }
});

const getStatusStyle = (remaining: number) => {
  if (remaining < 0) return styles.statusCritical;
  if (remaining < 30) return styles.statusWarning;
  return styles.statusGood;
};

const getStatusText = (remaining: number) => {
  if (remaining < 0) return 'CRITICAL';
  if (remaining < 30) return 'DUE SOON';
  return 'HEALTHY';
};

interface Asset {
  name: string;
  code: string;
  lastCal: string;
  dueDate: string;
  remaining: number;
  opStatus?: string;
}

interface SiteData {
  customer: string;
  name: string;
  location: string;
  serviceData: Asset[];
  rollerData: Asset[];
}

interface MaintenanceReportPDFProps {
  site: SiteData;
  generatedDate: string;
}

export const MaintenanceReportPDF: React.FC<MaintenanceReportPDFProps> = ({ 
  site, 
  generatedDate 
}) => {
  const allAssets = [...(site.serviceData || []), ...(site.rollerData || [])]
    .filter(asset => asset.active !== false);

  const criticalCount = allAssets.filter(a => a.remaining < 0).length;
  const dueSoonCount = allAssets.filter(a => a.remaining >= 0 && a.remaining < 30).length;
  const healthyCount = allAssets.filter(a => a.remaining >= 30).length;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image 
            src="/logos/ai-logo.png" 
            style={styles.logo}
          />
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Accurate Industries</Text>
            <Text style={styles.subtitle}>Maintenance Report</Text>
          </View>
        </View>
        
        {/* Site Information */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryText}>Customer: {site.customer}</Text>
          <Text style={styles.summaryText}>Site: {site.name}</Text>
          <Text style={styles.summaryText}>Location: {site.location}</Text>
          <Text style={styles.summaryText}>Generated: {generatedDate}</Text>
        </View>

        {/* Summary Statistics */}
        <View style={styles.summaryBox}>
          <Text style={styles.subtitle}>Summary</Text>
          <Text style={styles.summaryText}>Total Assets: {allAssets.length}</Text>
          <Text style={styles.summaryText}>Critical Attention Required: {criticalCount}</Text>
          <Text style={styles.summaryText}>Due Soon (Next 30 Days): {dueSoonCount}</Text>
          <Text style={styles.summaryText}>Healthy: {healthyCount}</Text>
        </View>

        {/* Service & Calibration Equipment */}
        {site.serviceData && site.serviceData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.subtitle}>Service & Calibration Equipment</Text>
            <View style={styles.headerRow}>
              <Text style={styles.headerCell}>Asset Name</Text>
              <Text style={styles.headerCell}>Code</Text>
              <Text style={styles.headerCell}>Last Service</Text>
              <Text style={styles.headerCell}>Due Date</Text>
              <Text style={styles.headerCell}>Days Remaining</Text>
              <Text style={styles.headerCell}>Status</Text>
            </View>
            {site.serviceData
              .filter(asset => asset.active !== false)
              .map((asset, index) => (
                <View key={`service-${index}`} style={styles.row}>
                  <Text style={styles.cell}>{asset.name}</Text>
                  <Text style={styles.cell}>{asset.code}</Text>
                  <Text style={styles.cell}>{asset.lastCal}</Text>
                  <Text style={styles.cell}>{asset.dueDate}</Text>
                  <Text style={styles.cell}>{asset.remaining}</Text>
                  <Text style={[styles.cell, getStatusStyle(asset.remaining)]}>
                    {getStatusText(asset.remaining)}
                  </Text>
                </View>
              ))}
          </View>
        )}

        {/* Roller Data */}
        {site.rollerData && site.rollerData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.subtitle}>Roller Equipment</Text>
            <View style={styles.headerRow}>
              <Text style={styles.headerCell}>Asset Name</Text>
              <Text style={styles.headerCell}>Code</Text>
              <Text style={styles.headerCell}>Last Service</Text>
              <Text style={styles.headerCell}>Due Date</Text>
              <Text style={styles.headerCell}>Days Remaining</Text>
              <Text style={styles.headerCell}>Status</Text>
            </View>
            {site.rollerData
              .filter(asset => asset.active !== false)
              .map((asset, index) => (
                <View key={`roller-${index}`} style={styles.row}>
                  <Text style={styles.cell}>{asset.name}</Text>
                  <Text style={styles.cell}>{asset.code}</Text>
                  <Text style={styles.cell}>{asset.lastCal}</Text>
                  <Text style={styles.cell}>{asset.dueDate}</Text>
                  <Text style={styles.cell}>{asset.remaining}</Text>
                  <Text style={[styles.cell, getStatusStyle(asset.remaining)]}>
                    {getStatusText(asset.remaining)}
                  </Text>
                </View>
              ))}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by AI Maintenance App - Report ID: {site.name}-{generatedDate}
        </Text>
      </Page>
    </Document>
  );
};

export default MaintenanceReportPDF;
