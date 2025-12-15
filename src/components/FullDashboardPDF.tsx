import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { countUniqueAssets } from '../utils/assetUtils';

// Asset interface for TypeScript
interface Asset {
  name: string;
  code: string;
  lastCal: string;
  dueDate: string;
  remaining: number;
  opStatus?: string;
  opNote?: string;
  active?: boolean;
}

interface SiteData {
  customer: string;
  name: string;
  location: string;
  serviceData: Asset[];
  rollerData: Asset[];
}

interface FullDashboardPDFProps {
  site: SiteData;
  generatedDate: string;
}

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
    marginBottom: 5,
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
  entryContainer: {
    flexDirection: 'column',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
    borderBottomStyle: 'solid',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  commentRow: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    padding: 4,
    marginHorizontal: 10,
    marginBottom: 4,
    marginTop: 2,
    borderRadius: 4,
  },
  commentText: {
    fontSize: 8,
    color: '#475569',
    fontStyle: 'italic',
  },
  commentLabel: {
    fontSize: 8,
    color: '#991b1b',
    fontWeight: 'bold',
    marginRight: 4,
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
  statusService: {
    color: '#4B5563',
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
  },
  kpiContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  kpiBox: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderRadius: 6,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  kpiBoxLast: {
    marginRight: 0,
  },
  kpiTitle: {
    fontSize: 8,
    textTransform: 'uppercase',
    color: '#64748B',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  healthContainer: {
    marginBottom: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  healthTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#9CA3AF',
  },
  healthLegend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flexDirection: 'row',
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressSegment: {
    height: '100%',
  },
  healthSummary: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  }
});

const getStatusStyle = (asset: Asset) => {
  if (asset.opStatus === 'Down') return styles.statusCritical;
  if (asset.opStatus === 'Warning') return styles.statusWarning;
  if (asset.opStatus === 'Out of Service') return styles.statusService;
  if (asset.remaining < 0) return styles.statusCritical;
  if (asset.remaining < 30) return styles.statusWarning;
  return styles.statusGood;
};

const getStatusText = (asset: Asset) => {
  if (asset.opStatus === 'Down') return 'CRITICAL';
  if (asset.opStatus === 'Warning') return 'WARNING';
  if (asset.opStatus === 'Out of Service') return 'OUT OF SERVICE';
  if (asset.remaining < 0) return 'OVERDUE';
  if (asset.remaining < 30) return 'DUE SOON';
  return 'OPERATIONAL';
};

export const FullDashboardPDF: React.FC<FullDashboardPDFProps> = ({
  site,
  generatedDate
}) => {
  const allAssets = [...(site.serviceData || []), ...(site.rollerData || [])]
    .filter(asset => asset.active !== false);

  const criticalCount = allAssets.filter(a => a.remaining < 0).length;
  const dueSoonCount = allAssets.filter(a => a.remaining >= 0 && a.remaining < 30).length;
  const healthyCount = allAssets.filter(a => a.remaining >= 30).length;
  const totalCount = countUniqueAssets(site.serviceData, site.rollerData);

  const criticalPct = totalCount > 0 ? (criticalCount / totalCount) * 100 : 0;
  const dueSoonPct = totalCount > 0 ? (dueSoonCount / totalCount) * 100 : 0;
  const healthyPct = totalCount > 0 ? (healthyCount / totalCount) * 100 : 0;

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
            <Text style={styles.subtitle}>Full Dashboard Report</Text>
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
        <View style={styles.kpiContainer}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiTitle}>Total Assets</Text>
            <Text style={styles.kpiValue}>{totalCount}</Text>
          </View>
          <View style={[styles.kpiBox, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}>
            <Text style={[styles.kpiTitle, { color: '#DC2626' }]}>Critical</Text>
            <Text style={[styles.kpiValue, { color: '#DC2626' }]}>{criticalCount}</Text>
          </View>
          <View style={[styles.kpiBox, { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }]}>
            <Text style={[styles.kpiTitle, { color: '#D97706' }]}>Due Soon</Text>
            <Text style={[styles.kpiValue, { color: '#D97706' }]}>{dueSoonCount}</Text>
          </View>
          <View style={[styles.kpiBox, styles.kpiBoxLast, { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }]}>
            <Text style={[styles.kpiTitle, { color: '#059669' }]}>Healthy</Text>
            <Text style={[styles.kpiValue, { color: '#059669' }]}>{healthyCount}</Text>
          </View>
        </View>

        {/* Overall Health Bar */}
        <View style={styles.healthContainer}>
          <View style={styles.healthHeader}>
            <Text style={styles.healthTitle}>Overall Health</Text>
            <View style={styles.healthLegend}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginRight: 4 }} />
                <Text style={{ fontSize: 8, color: '#EF4444' }}>{Math.round(criticalPct)}%</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B', marginRight: 4 }} />
                <Text style={{ fontSize: 8, color: '#F59E0B' }}>{Math.round(dueSoonPct)}%</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 4 }} />
                <Text style={{ fontSize: 8, color: '#10B981' }}>{Math.round(healthyPct)}%</Text>
              </View>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressSegment, { width: `${criticalPct}%`, backgroundColor: '#EF4444' }]} />
            <View style={[styles.progressSegment, { width: `${dueSoonPct}%`, backgroundColor: '#F59E0B' }]} />
            <View style={[styles.progressSegment, { width: `${healthyPct}%`, backgroundColor: '#10B981' }]} />
          </View>
          <View style={styles.healthSummary}>
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#EF4444' }}>{Math.round(criticalPct)}% Critical</Text>
            <Text style={{ fontSize: 9, color: '#9CA3AF', marginLeft: 4 }}>({criticalCount} assets)</Text>
          </View>
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
                <View key={`service-${index}`} style={styles.entryContainer}>
                  <View style={styles.row}>
                    <Text style={styles.cell}>{asset.name}</Text>
                    <Text style={styles.cell}>{asset.code}</Text>
                    <Text style={styles.cell}>{asset.lastCal}</Text>
                    <Text style={styles.cell}>{asset.dueDate}</Text>
                    <Text style={styles.cell}>{asset.remaining}</Text>
                    <Text style={[styles.cell, getStatusStyle(asset)]}>
                      {getStatusText(asset)}
                    </Text>
                  </View>
                  {(asset.opStatus === 'Down' || asset.opStatus === 'Warning' || asset.opStatus === 'Out of Service') && asset.opNote && (
                    <View style={styles.commentRow}>
                      <Text style={styles.commentLabel}>Comment:</Text>
                      <Text style={styles.commentText}>{asset.opNote}</Text>
                    </View>
                  )}
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
                <View key={`roller-${index}`} style={styles.entryContainer}>
                  <View style={styles.row}>
                    <Text style={styles.cell}>{asset.name}</Text>
                    <Text style={styles.cell}>{asset.code}</Text>
                    <Text style={styles.cell}>{asset.lastCal}</Text>
                    <Text style={styles.cell}>{asset.dueDate}</Text>
                    <Text style={styles.cell}>{asset.remaining}</Text>
                    <Text style={[styles.cell, getStatusStyle(asset)]}>
                      {getStatusText(asset)}
                    </Text>
                  </View>
                  {(asset.opStatus === 'Down' || asset.opStatus === 'Warning' || asset.opStatus === 'Out of Service') && asset.opNote && (
                    <View style={styles.commentRow}>
                      <Text style={styles.commentLabel}>Comment:</Text>
                      <Text style={styles.commentText}>{asset.opNote}</Text>
                    </View>
                  )}
                </View>
              ))}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by AI Maintenance App - Full Dashboard Report - {generatedDate}
        </Text>
      </Page>
    </Document>
  );
};


