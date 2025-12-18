import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

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
  reportType?: 'service' | 'roller' | 'full';
}

// Light theme color palette (matching the preview - print friendly)
const colors = {
  pageBg: '#ffffff',       // white
  cardBg: '#f9fafb',       // gray-50
  borderColor: '#d1d5db',  // gray-300
  textPrimary: '#000000',  // black
  textSecondary: '#000000', // black
  textMuted: '#6b7280',    // gray-500
  critical: '#dc2626',     // red-600
  criticalBg: '#fef2f2',   // red-50
  warning: '#d97706',      // amber-600
  warningBg: '#fffbeb',    // amber-50
  healthy: '#16a34a',      // green-600
  healthyBg: '#f0fdf4',    // green-50
  accent: '#000000',       // black (for headers/titles)
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
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 10,
    fontWeight: 'bold',
    color: colors.accent,
  },
  section: {
    marginBottom: 15,
  },
  siteInfoBox: {
    backgroundColor: colors.cardBg,
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  siteInfoText: {
    fontSize: 10,
    marginBottom: 3,
    color: colors.textSecondary,
  },
  siteInfoLabel: {
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
    borderBottomStyle: 'solid',
    paddingBottom: 5,
    marginBottom: 5,
    fontWeight: 'bold',
    backgroundColor: colors.cardBg,
  },
  entryContainer: {
    flexDirection: 'column',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderColor,
    borderBottomStyle: 'solid',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  commentRow: {
    flexDirection: 'row',
    backgroundColor: colors.criticalBg,
    padding: 4,
    marginHorizontal: 10,
    marginBottom: 4,
    marginTop: 2,
    borderRadius: 4,
  },
  commentText: {
    fontSize: 8,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  commentLabel: {
    fontSize: 8,
    color: colors.critical,
    fontWeight: 'bold',
    marginRight: 4,
  },
  cell: {
    flex: 1,
    paddingHorizontal: 5,
    fontSize: 9,
    color: colors.textSecondary,
  },
  headerCell: {
    flex: 1,
    paddingHorizontal: 5,
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  statusCritical: {
    color: colors.critical,
    fontWeight: 'bold',
  },
  statusWarning: {
    color: colors.warning,
    fontWeight: 'bold',
  },
  statusGood: {
    color: colors.healthy,
    fontWeight: 'bold',
  },
  statusService: {
    color: colors.textMuted,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 8,
    color: colors.textMuted,
    borderTopWidth: 1,
    borderTopColor: colors.borderColor,
    borderTopStyle: 'solid',
    paddingTop: 10,
    textAlign: 'center',
  },
  // Stats cards above each section
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  statsBox: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderRadius: 6,
    marginRight: 6,
  },
  statsBoxLast: {
    marginRight: 0,
  },
  statsTitle: {
    fontSize: 8,
    textTransform: 'uppercase',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  statsValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Dashboard Summary styles
  dashboardSummaryContainer: {
    marginBottom: 20,
  },
  dashboardSummaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingBottom: 8,
    marginBottom: 12,
  },
  healthBarContainer: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    backgroundColor: '#ffffff',
    marginTop: 12,
  },
  healthBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  healthBarLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  healthBarLegend: {
    flexDirection: 'row',
  },
  healthBarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  healthDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  healthPercentText: {
    fontSize: 8,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  healthBarOuter: {
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  healthBarCritical: {
    backgroundColor: '#ef4444',
  },
  healthBarWarning: {
    backgroundColor: '#f59e0b',
  },
  healthBarHealthy: {
    backgroundColor: '#22c55e',
  },
  healthBarFooter: {
    marginTop: 8,
    alignItems: 'center',
  },
  healthBarFooterText: {
    fontSize: 10,
    color: '#dc2626',
    fontWeight: 'bold',
  },
  healthBarFooterSubtext: {
    fontSize: 8,
    color: '#6b7280',
  },
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

// Calculate stats for a single asset array
const calculateStats = (assets: Asset[]) => {
  const activeAssets = (assets || []).filter(a => a.active !== false);
  const critical = activeAssets.filter(a => a.remaining < 0).length;
  const dueSoon = activeAssets.filter(a => a.remaining >= 0 && a.remaining < 30).length;
  const healthy = activeAssets.filter(a => a.remaining >= 30).length;
  const total = activeAssets.length;
  return { critical, dueSoon, healthy, total };
};

// Stats cards component for each section
const SectionStatsCards = ({ stats, label }: { stats: ReturnType<typeof calculateStats>, label: string }) => (
  <View style={styles.statsContainer}>
    <View style={[styles.statsBox, { borderColor: colors.borderColor, backgroundColor: colors.cardBg }]}>
      <Text style={[styles.statsTitle, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statsValue, { color: colors.textPrimary }]}>{stats.total}</Text>
    </View>
    <View style={[styles.statsBox, { borderColor: colors.critical, backgroundColor: colors.criticalBg }]}>
      <Text style={[styles.statsTitle, { color: colors.critical }]}>Overdue</Text>
      <Text style={[styles.statsValue, { color: colors.critical }]}>{stats.critical}</Text>
    </View>
    <View style={[styles.statsBox, { borderColor: colors.warning, backgroundColor: colors.warningBg }]}>
      <Text style={[styles.statsTitle, { color: colors.warning }]}>Due Soon</Text>
      <Text style={[styles.statsValue, { color: colors.warning }]}>{stats.dueSoon}</Text>
    </View>
    <View style={[styles.statsBox, styles.statsBoxLast, { borderColor: colors.healthy, backgroundColor: colors.healthyBg }]}>
      <Text style={[styles.statsTitle, { color: colors.healthy }]}>Healthy</Text>
      <Text style={[styles.statsValue, { color: colors.healthy }]}>{stats.healthy}</Text>
    </View>
  </View>
);

export const FullDashboardPDF: React.FC<FullDashboardPDFProps> = ({
  site,
  generatedDate,
  reportType = 'full'
}) => {
  // Calculate separate stats for each section
  const serviceStats = calculateStats(site.serviceData);
  const rollerStats = calculateStats(site.rollerData);

  // Dynamic title based on report type
  const getTitle = () => {
    if (reportType === 'service') return 'SERVICE EQUIPMENT DASHBOARD';
    if (reportType === 'roller') return 'ROLLER EQUIPMENT DASHBOARD';
    return 'FULL DASHBOARD REPORT';
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{getTitle()}</Text>
            {site.customer ? (
              <Text style={[styles.subtitle, { color: colors.accent }]}>{site.customer}</Text>
            ) : null}
          </View>
        </View>

        {/* Site Information */}
        <View style={styles.siteInfoBox}>
          <Text style={styles.siteInfoText}>{site.location}</Text>
          <Text style={styles.siteInfoText}>Generated: {generatedDate}</Text>
        </View>

        {/* Dashboard Summary Section - Only show for full reports */}
        {reportType === 'full' && (() => {
          const allAssets = [...(site.serviceData || []), ...(site.rollerData || [])].filter(a => a.active !== false);
          const totalAssets = allAssets.length;
          const criticalCount = allAssets.filter(a => a.remaining < 0).length;
          const dueSoonCount = allAssets.filter(a => a.remaining >= 0 && a.remaining < 30).length;
          const healthyCount = allAssets.filter(a => a.remaining >= 30).length;
          const criticalPct = totalAssets > 0 ? Math.round((criticalCount / totalAssets) * 100) : 0;
          const dueSoonPct = totalAssets > 0 ? Math.round((dueSoonCount / totalAssets) * 100) : 0;
          const healthyPct = totalAssets > 0 ? Math.round((healthyCount / totalAssets) * 100) : 0;

          return (
            <View style={styles.dashboardSummaryContainer}>
              <Text style={styles.dashboardSummaryTitle}>Dashboard Summary</Text>

              {/* Stats Cards */}
              <View style={styles.statsContainer}>
                <View style={[styles.statsBox, { borderColor: colors.borderColor, backgroundColor: colors.cardBg }]}>
                  <Text style={[styles.statsTitle, { color: colors.textMuted }]}>Total Assets</Text>
                  <Text style={[styles.statsValue, { color: colors.textPrimary }]}>{totalAssets}</Text>
                </View>
                <View style={[styles.statsBox, { borderColor: colors.borderColor, backgroundColor: colors.criticalBg }]}>
                  <Text style={[styles.statsTitle, { color: colors.critical }]}>Overdue</Text>
                  <Text style={[styles.statsValue, { color: colors.critical }]}>{criticalCount}</Text>
                </View>
                <View style={[styles.statsBox, { borderColor: colors.borderColor, backgroundColor: colors.warningBg }]}>
                  <Text style={[styles.statsTitle, { color: colors.warning }]}>Due Soon</Text>
                  <Text style={[styles.statsValue, { color: colors.warning }]}>{dueSoonCount}</Text>
                </View>
                <View style={[styles.statsBox, styles.statsBoxLast, { borderColor: colors.borderColor, backgroundColor: colors.healthyBg }]}>
                  <Text style={[styles.statsTitle, { color: colors.healthy }]}>Healthy</Text>
                  <Text style={[styles.statsValue, { color: colors.healthy }]}>{healthyCount}</Text>
                </View>
              </View>

              {/* Overall Health Bar */}
              <View style={styles.healthBarContainer}>
                <View style={styles.healthBarHeader}>
                  <Text style={styles.healthBarLabel}>Overall Health</Text>
                  <View style={styles.healthBarLegend}>
                    <View style={styles.healthBarLegendItem}>
                      <View style={[styles.healthDot, { backgroundColor: '#ef4444' }]} />
                      <Text style={[styles.healthPercentText, { color: '#dc2626' }]}>{criticalPct}%</Text>
                    </View>
                    <View style={styles.healthBarLegendItem}>
                      <View style={[styles.healthDot, { backgroundColor: '#f59e0b' }]} />
                      <Text style={[styles.healthPercentText, { color: '#d97706' }]}>{dueSoonPct}%</Text>
                    </View>
                    <View style={styles.healthBarLegendItem}>
                      <View style={[styles.healthDot, { backgroundColor: '#22c55e' }]} />
                      <Text style={[styles.healthPercentText, { color: '#16a34a' }]}>{healthyPct}%</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.healthBarOuter}>
                  {criticalPct > 0 && <View style={[styles.healthBarCritical, { flex: criticalPct }]} />}
                  {dueSoonPct > 0 && <View style={[styles.healthBarWarning, { flex: dueSoonPct }]} />}
                  {healthyPct > 0 && <View style={[styles.healthBarHealthy, { flex: healthyPct }]} />}
                </View>
                <View style={styles.healthBarFooter}>
                  <Text style={styles.healthBarFooterText}>{criticalPct}% Overdue <Text style={styles.healthBarFooterSubtext}>({criticalCount} assets)</Text></Text>
                </View>
              </View>
            </View>
          );
        })()}

        {/* Service Equipment Section */}
        {site.serviceData && site.serviceData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Equipment</Text>
            <SectionStatsCards stats={serviceStats} label="Service Equipment" />
            <View style={styles.headerRow}>
              <Text style={styles.headerCell}>NAME</Text>
              <Text style={styles.headerCell}>CODE</Text>
              <Text style={styles.headerCell}>LAST SERVICE</Text>
              <Text style={styles.headerCell}>DUE DATE</Text>
              <Text style={styles.headerCell}>DAYS REMAINING</Text>
              <Text style={styles.headerCell}>OPERATIONAL STATUS</Text>
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

        {/* Roller Equipment Section */}
        {site.rollerData && site.rollerData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Roller Equipment</Text>
            <SectionStatsCards stats={rollerStats} label="Roller Equipment" />
            <View style={styles.headerRow}>
              <Text style={styles.headerCell}>NAME</Text>
              <Text style={styles.headerCell}>CODE</Text>
              <Text style={styles.headerCell}>LAST SERVICE</Text>
              <Text style={styles.headerCell}>DUE DATE</Text>
              <Text style={styles.headerCell}>DAYS REMAINING</Text>
              <Text style={styles.headerCell}>OPERATIONAL STATUS</Text>
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
