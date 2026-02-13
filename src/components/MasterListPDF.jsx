import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    padding: 25,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#333333',
    marginBottom: 2,
  },
  meta: {
    fontSize: 9,
    color: '#666666',
  },
  table: {
    width: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#cccccc',
    minHeight: 18,
    alignItems: 'center',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#999999',
    borderTopWidth: 1,
    borderTopColor: '#999999',
    minHeight: 22,
    alignItems: 'center',
  },
  // Column widths - total = 100%
  colName:       { width: '14%', paddingHorizontal: 3, paddingVertical: 2 },
  colCode:       { width: '8%',  paddingHorizontal: 3, paddingVertical: 2 },
  colType:       { width: '5%',  paddingHorizontal: 3, paddingVertical: 2 },
  colLastCal:    { width: '7%',  paddingHorizontal: 3, paddingVertical: 2 },
  colCalDue:     { width: '7%',  paddingHorizontal: 3, paddingVertical: 2 },
  colScaleType:  { width: '8%',  paddingHorizontal: 3, paddingVertical: 2 },
  colIntegrator: { width: '8%',  paddingHorizontal: 3, paddingVertical: 2 },
  colSpeed:      { width: '8%',  paddingHorizontal: 3, paddingVertical: 2 },
  colLoadCell:   { width: '8%',  paddingHorizontal: 3, paddingVertical: 2 },
  colBillet:     { width: '7%',  paddingHorizontal: 3, paddingVertical: 2 },
  colRollerDims: { width: '14%', paddingHorizontal: 3, paddingVertical: 2 },
  colAdjustment: { width: '6%',  paddingHorizontal: 3, paddingVertical: 2 },

  headerText: {
    fontSize: 7,
    fontWeight: 'bold',
  },
  cellText: {
    fontSize: 7,
  },
  archived: {
    color: '#999999',
    fontStyle: 'italic',
  },
  // Vertical separator between column groups
  specBorderLeft: {
    borderLeftWidth: 0.5,
    borderLeftColor: '#cccccc',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 15,
    right: 25,
    fontSize: 8,
    color: '#999999',
  },
});

const MasterListPDF = ({
  site,
  serviceData,
  rollerData,
  specData,
  showArchived,
  generatedDate
}) => {
  const allAssets = [...serviceData, ...rollerData].filter(asset => {
    if (!showArchived && asset.active === false) return false;
    return true;
  }).map(asset => {
    const spec = specData.find(s =>
      s.weigher === asset.weigher ||
      s.altCode === asset.code ||
      s.weigher === asset.code
    );
    return { ...asset, spec: spec || {} };
  });

  // Sort by name, then code
  allAssets.sort((a, b) => a.name.localeCompare(b.name) || (a.code || '').localeCompare(b.code || ''));

  const formatSpecData = (spec) => {
    if (!spec) return '-';
    const parts = [];
    if (spec.loadCellBrand) parts.push(spec.loadCellBrand);
    if (spec.loadCellSize) parts.push(spec.loadCellSize);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  const formatBilletInfo = (spec) => {
    if (!spec) return '-';
    const parts = [];
    if (spec.billetWeightType) parts.push(spec.billetWeightType);
    if (spec.billetWeightSize) parts.push(spec.billetWeightSize);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  const formatRollerDimensions = (spec) => {
    if (!spec) return '-';
    let rollDims = spec.rollDims || '-';
    if (typeof rollDims === 'object' && rollDims !== null) {
      rollDims = rollDims.value || JSON.stringify(rollDims);
    }
    if (typeof rollDims === 'string') {
      rollDims = rollDims.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }
    if (rollDims && (rollDims.includes('<') || rollDims.includes('{') || rollDims.includes('Editable'))) {
      return '-';
    }
    return rollDims || '-';
  };

  const formatDatePDF = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return '-';
    }
  };

  const rowsPerPage = 25;
  const pages = [];
  for (let i = 0; i < allAssets.length; i += rowsPerPage) {
    pages.push(allAssets.slice(i, i + rowsPerPage));
  }
  const totalPages = pages.length;

  const renderHeaderRow = () => (
    <View style={styles.tableHeaderRow}>
      <View style={styles.colName}><Text style={styles.headerText}>Asset Name</Text></View>
      <View style={styles.colCode}><Text style={styles.headerText}>Code</Text></View>
      <View style={styles.colType}><Text style={styles.headerText}>Type</Text></View>
      <View style={styles.colLastCal}><Text style={styles.headerText}>Last Cal</Text></View>
      <View style={styles.colCalDue}><Text style={styles.headerText}>Cal Due</Text></View>
      <View style={[styles.colScaleType, styles.specBorderLeft]}><Text style={styles.headerText}>Scale Type</Text></View>
      <View style={styles.colIntegrator}><Text style={styles.headerText}>Integrator</Text></View>
      <View style={styles.colSpeed}><Text style={styles.headerText}>Speed Sensor</Text></View>
      <View style={styles.colLoadCell}><Text style={styles.headerText}>Load Cell</Text></View>
      <View style={styles.colBillet}><Text style={styles.headerText}>Billet Info</Text></View>
      <View style={[styles.colRollerDims, styles.specBorderLeft]}><Text style={styles.headerText}>Roller Dims</Text></View>
      <View style={styles.colAdjustment}><Text style={styles.headerText}>Adj. Type</Text></View>
    </View>
  );

  return (
    <Document>
      {pages.map((pageAssets, pageIdx) => (
        <Page key={`page-${pageIdx}`} size="A4" orientation="landscape" style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Master Equipment List</Text>
            <Text style={styles.subtitle}>
              Customer: {site.customer} | Site: {site.name} | Location: {site.location}
            </Text>
            <Text style={styles.meta}>
              Generated: {generatedDate} | Page {pageIdx + 1} of {totalPages} | Showing {pageIdx * rowsPerPage + 1}-{Math.min((pageIdx + 1) * rowsPerPage, allAssets.length)} of {allAssets.length} assets
            </Text>
          </View>

          {/* Table */}
          <View style={styles.table}>
            {renderHeaderRow()}

            {pageAssets.map((asset, idx) => {
              const isService = serviceData.some(s => s.id === asset.id);
              const isArchived = asset.active === false;
              const textStyle = isArchived ? [styles.cellText, styles.archived] : styles.cellText;
              const rowBg = idx % 2 === 0 ? {} : { backgroundColor: '#fafafa' };

              return (
                <View key={asset.id} style={[styles.tableRow, rowBg]}>
                  <View style={styles.colName}><Text style={textStyle}>{asset.name || ''}{isArchived ? ' (Archived)' : ''}</Text></View>
                  <View style={styles.colCode}><Text style={textStyle}>{asset.code || ''}</Text></View>
                  <View style={styles.colType}><Text style={textStyle}>{isService ? 'Svc' : 'Rlr'}</Text></View>
                  <View style={styles.colLastCal}><Text style={textStyle}>{formatDatePDF(asset.lastCal)}</Text></View>
                  <View style={styles.colCalDue}><Text style={textStyle}>{formatDatePDF(asset.dueDate)}</Text></View>
                  <View style={[styles.colScaleType, styles.specBorderLeft]}><Text style={textStyle}>{asset.spec?.scaleType || '-'}</Text></View>
                  <View style={styles.colIntegrator}><Text style={textStyle}>{asset.spec?.integratorController || '-'}</Text></View>
                  <View style={styles.colSpeed}><Text style={textStyle}>{asset.spec?.speedSensorType || '-'}</Text></View>
                  <View style={styles.colLoadCell}><Text style={textStyle}>{formatSpecData(asset.spec)}</Text></View>
                  <View style={styles.colBillet}><Text style={textStyle}>{formatBilletInfo(asset.spec)}</Text></View>
                  <View style={[styles.colRollerDims, styles.specBorderLeft]}><Text style={textStyle}>{formatRollerDimensions(asset.spec)}</Text></View>
                  <View style={styles.colAdjustment}><Text style={textStyle}>{asset.spec?.adjustmentType || '-'}</Text></View>
                </View>
              );
            })}
          </View>

          <Text style={styles.pageNumber}>Page {pageIdx + 1} of {totalPages}</Text>
        </Page>
      ))}
    </Document>
  );
};

export default MasterListPDF;
