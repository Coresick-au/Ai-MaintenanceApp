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

interface FullDashboardPDFProps {
  site: SiteData;
  generatedDate: string;
}

// Dark theme color palette (matching the app UI)
const colors = {
  pageBg: '#0f172a',       // slate-900
  cardBg: '#1e293b',       // slate-800
  borderColor: '#334155',  // slate-700
  textPrimary: '#f1f5f9',  // slate-100
  textSecondary: '#94a3b8', // slate-400
  textMuted: '#64748b',    // slate-500
  critical: '#ef4444',     // red-500
  criticalBg: '#7f1d1d',   // red-900
  warning: '#f59e0b',      // amber-500
  warningBg: '#78350f',    // amber-900
  healthy: '#10b981',      // emerald-500
  healthyBg: '#064e3b',    // emerald-900
  accent: '#06b6d4',       // cyan-500
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
      <Text style={[styles.statsTitle, { color: colors.critical }]}>Critical</Text>
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
  generatedDate
}) => {
  // Calculate separate stats for each section
  const serviceStats = calculateStats(site.serviceData);
  const rollerStats = calculateStats(site.rollerData);

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
            <Text style={styles.title}>FULL DASHBOARD REPORT</Text>
            <Text style={[styles.subtitle, { color: colors.accent }]}>| {site.customer}</Text>
          </View>
        </View>

        {/* Site Information */}
        <View style={styles.siteInfoBox}>
          <Text style={styles.siteInfoText}>📍 {site.location}</Text>
          <Text style={styles.siteInfoText}>Generated: {generatedDate}</Text>
        </View>

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
