import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

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

interface ScheduleChartPDFProps {
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
  chartContainer: {
    marginBottom: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#374151',
  },
  chartGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  chartBar: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    width: '80%',
    height: 60,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 5,
    position: 'relative',
  },
  barFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 8,
    textAlign: 'center',
    color: '#64748B',
  },
  barValue: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
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

export const ScheduleChartPDF: React.FC<ScheduleChartPDFProps> = ({
  site,
  generatedDate
}) => {
  const allAssets = [...(site.serviceData || []), ...(site.rollerData || [])]
    .filter(asset => asset.active !== false);

  const criticalCount = allAssets.filter(a => a.remaining < 0).length;
  const dueSoonCount = allAssets.filter(a => a.remaining >= 0 && a.remaining < 30).length;
  const healthyCount = allAssets.filter(a => a.remaining >= 30).length;
  const totalCount = allAssets.length;

  const criticalPct = totalCount > 0 ? (criticalCount / totalCount) * 100 : 0;
  const dueSoonPct = totalCount > 0 ? (dueSoonCount / totalCount) * 100 : 0;
  const healthyPct = totalCount > 0 ? (healthyCount / totalCount) * 100 : 0;

  // Sort assets by due date for schedule
  const sortedAssets = allAssets.sort((a, b) => a.remaining - b.remaining);

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
            <Text style={styles.subtitle}>Schedule & Chart Report</Text>
          </View>
        </View>

        {/* Site Information */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryText}>Customer: {site.customer}</Text>
          <Text style={styles.summaryText}>Site: {site.name}</Text>
          <Text style={styles.summaryText}>Location: {site.location}</Text>
          <Text style={styles.summaryText}>Generated: {generatedDate}</Text>
        </View>

        {/* Overall Health Bar */}
        <View style={styles.chartContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', color: '#9CA3AF' }}>Overall Health</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
          <View style={{ flexDirection: 'row', height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${criticalPct}%`, backgroundColor: '#EF4444' }} />
            <View style={{ height: '100%', width: `${dueSoonPct}%`, backgroundColor: '#F59E0B' }} />
            <View style={{ height: '100%', width: `${healthyPct}%`, backgroundColor: '#10B981' }} />
          </View>
        </View>

        {/* Combined Schedule */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>Maintenance Schedule</Text>
          <View style={styles.headerRow}>
            <Text style={styles.headerCell}>Asset Name</Text>
            <Text style={styles.headerCell}>Code</Text>
            <Text style={styles.headerCell}>Type</Text>
            <Text style={styles.headerCell}>Last Service</Text>
            <Text style={styles.headerCell}>Due Date</Text>
            <Text style={styles.headerCell}>Days Remaining</Text>
            <Text style={styles.headerCell}>Status</Text>
          </View>
          {sortedAssets.map((asset, index) => (
            <View key={`asset-${index}`} style={styles.entryContainer}>
              <View style={styles.row}>
                <Text style={styles.cell}>{asset.name}</Text>
                <Text style={styles.cell}>{asset.code}</Text>
                <Text style={styles.cell}>
                  {site.serviceData?.includes(asset) ? 'Service' : 'Roller'}
                </Text>
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

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by AI Maintenance App - Schedule & Chart Report - {generatedDate}
        </Text>
      </Page>
    </Document>
  );
};


