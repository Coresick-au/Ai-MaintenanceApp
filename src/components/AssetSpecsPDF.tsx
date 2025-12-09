import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Asset interface for TypeScript
interface Asset {
  id: string;
  name: string;
  code: string;
  lastCal: string;
  dueDate: string;
  remaining: number;
  opStatus?: string;
  opNote?: string;
  active?: boolean;
  weigher?: string;
}

interface AssetSpec {
  description: string;
  weigher: string;
  scaleType?: string;
  integratorController?: string;
  speedSensorType?: string;
  loadCellBrand?: string;
  loadCellSize?: string;
  loadCellSensitivity?: string;
  numberOfLoadCells?: string;
  rollDims?: string;
  adjustmentType?: string;
  billetWeightType?: string;
  billetWeightSize?: string;
  billetWeightIds?: string[];
  notes?: Array<{
    id: string;
    content: string;
    author: string;
    timestamp: string;
  }>;
}

interface AssetWithSpecs {
  asset: Asset;
  specs: AssetSpec;
}

interface AssetSpecsPDFProps {
  assets: AssetWithSpecs[];
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#374151',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderBottomStyle: 'solid',
    paddingBottom: 4,
  },
  infoBox: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    width: 120,
    color: '#374151',
  },
  infoValue: {
    fontSize: 10,
    flex: 1,
    color: '#1F2937',
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  specsItem: {
    width: '50%',
    marginBottom: 5,
  },
  specsLabel: {
    fontSize: 9,
    color: '#64748B',
    marginBottom: 1,
  },
  specsValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  commentContainer: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1F2937',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  commentDate: {
    fontSize: 8,
    color: '#64748B',
  },
  commentContent: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.4,
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
  },
  statusCritical: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
  },
  statusWarning: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
  statusGood: {
    backgroundColor: '#D1FAE5',
    color: '#059669',
  },
  statusService: {
    backgroundColor: '#E5E7EB',
    color: '#4B5563',
  },
  codeBlock: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 4,
    fontFamily: 'Courier',
    fontSize: 9,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'solid',
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

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};

export const AssetSpecsPDF: React.FC<AssetSpecsPDFProps> = ({
  assets,
  generatedDate
}) => {
  return (
    <Document>
      {assets.map((assetWithSpecs, index) => (
        <Page key={assetWithSpecs.asset.id} size="A4" style={styles.page} wrap={false}>
          {/* Header */}
          <View style={styles.header}>
            <Image
              src="./logos/ai-logo.png"
              style={styles.logo}
            />
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Accurate Industries</Text>
              <Text style={styles.subtitle}>Asset Specifications ({index + 1} of {assets.length})</Text>
            </View>
          </View>

          {/* Asset Information */}
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Asset Name:</Text>
              <Text style={styles.infoValue}>{assetWithSpecs.asset.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Asset Code:</Text>
              <Text style={styles.infoValue}>{assetWithSpecs.asset.code}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Weigher ID:</Text>
              <Text style={styles.infoValue}>{assetWithSpecs.specs.weigher}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Description:</Text>
              <Text style={styles.infoValue}>{assetWithSpecs.specs.description}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={[styles.statusBadge, getStatusStyle(assetWithSpecs.asset)]}>
                {getStatusText(assetWithSpecs.asset)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Service:</Text>
              <Text style={styles.infoValue}>{formatDate(assetWithSpecs.asset.lastCal)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Due Date:</Text>
              <Text style={styles.infoValue}>{formatDate(assetWithSpecs.asset.dueDate)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Days Remaining:</Text>
              <Text style={styles.infoValue}>{assetWithSpecs.asset.remaining}</Text>
            </View>
          </View>

          {/* Scale Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scale Details</Text>
            <View style={styles.specsGrid}>
              <View style={styles.specsItem}>
                <Text style={styles.specsLabel}>Scale Type</Text>
                <Text style={styles.specsValue}>{assetWithSpecs.specs.scaleType || 'N/A'}</Text>
              </View>
              <View style={styles.specsItem}>
                <Text style={styles.specsLabel}>Integrator Controller</Text>
                <Text style={styles.specsValue}>{assetWithSpecs.specs.integratorController || 'N/A'}</Text>
              </View>
              <View style={styles.specsItem}>
                <Text style={styles.specsLabel}>Speed Sensor Type</Text>
                <Text style={styles.specsValue}>{assetWithSpecs.specs.speedSensorType || 'N/A'}</Text>
              </View>
              <View style={styles.specsItem}>
                <Text style={styles.specsLabel}>Load Cell Brand</Text>
                <Text style={styles.specsValue}>{assetWithSpecs.specs.loadCellBrand || 'N/A'}</Text>
              </View>
              <View style={styles.specsItem}>
                <Text style={styles.specsLabel}>Load Cell Size</Text>
                <Text style={styles.specsValue}>{assetWithSpecs.specs.loadCellSize || 'N/A'}</Text>
              </View>
              <View style={styles.specsItem}>
                <Text style={styles.specsLabel}>Load Cell Sensitivity</Text>
                <Text style={styles.specsValue}>{assetWithSpecs.specs.loadCellSensitivity || 'N/A'}</Text>
              </View>
              <View style={styles.specsItem}>
                <Text style={styles.specsLabel}>Number of Load Cells</Text>
                <Text style={styles.specsValue}>{assetWithSpecs.specs.numberOfLoadCells || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Roller Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Roller Details</Text>
            <View style={styles.specsGrid}>
              <View style={styles.specsItem}>
                <Text style={styles.specsLabel}>Roller Dimensions (Dia x Face x B2B x Total x Shaft x Slot (#) Adjustment Type)</Text>
                <View style={styles.codeBlock}>
                  <Text>{assetWithSpecs.specs.rollDims || 'N/A'}</Text>
                </View>
              </View>
              <View style={styles.specsItem}>
                <Text style={styles.specsLabel}>Adjustment Type</Text>
                <Text style={styles.specsValue}>{assetWithSpecs.specs.adjustmentType || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Billet Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Billet Details</Text>
            <View style={styles.specsGrid}>
              <View style={styles.specsItem}>
                <Text style={styles.specsLabel}>Billet Weight Type</Text>
                <Text style={styles.specsValue}>{assetWithSpecs.specs.billetWeightType || 'N/A'}</Text>
              </View>
              <View style={styles.specsItem}>
                <Text style={styles.specsLabel}>Billet Weight Size</Text>
                <Text style={styles.specsValue}>{assetWithSpecs.specs.billetWeightSize || 'N/A'}</Text>
              </View>
            </View>
            {assetWithSpecs.specs.billetWeightIds && assetWithSpecs.specs.billetWeightIds.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.specsLabel}>Billet Weight IDs:</Text>
                <View style={styles.codeBlock}>
                  <Text>{assetWithSpecs.specs.billetWeightIds.join(', ')}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Comments */}
          {assetWithSpecs.specs.notes && assetWithSpecs.specs.notes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Comments ({assetWithSpecs.specs.notes.length})</Text>
              {assetWithSpecs.specs.notes.map((note, noteIndex) => (
                <View key={note.id || noteIndex} style={styles.commentContainer}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{note.author || 'UNK'}</Text>
                    <Text style={styles.commentDate}>{formatDate(note.timestamp)}</Text>
                  </View>
                  <Text style={styles.commentContent}>{note.content}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Operational Note */}
          {assetWithSpecs.asset.opNote && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Operational Note</Text>
              <View style={[styles.commentContainer, { borderLeftColor: '#EF4444', backgroundColor: '#FEF2F2' }]}>
                <Text style={styles.commentContent}>{assetWithSpecs.asset.opNote}</Text>
              </View>
            </View>
          )}

          {/* Footer */}
          <Text style={styles.footer}>
            Generated by AI Maintenance App - Asset Specifications - {generatedDate} - Page {index + 1} of {assets.length}
          </Text>
        </Page>
      ))}
    </Document>
  );
};

export default AssetSpecsPDF;
