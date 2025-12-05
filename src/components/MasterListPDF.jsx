import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts
Font.register({
  family: 'Helvetica',
  src: 'https://fonts.googleapis.com/css2?family=Helvetica:wght@400;700&display=swap'
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 20,
    size: 'A4',
    orientation: 'landscape'
  },
  section: {
    flexGrow: 1,
  },
  header: {
    marginBottom: 30,
    borderBottom: '2px solid #000000',
    paddingBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Helvetica',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Helvetica',
    color: '#666666',
    marginBottom: 4,
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000000',
    marginBottom: 10,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '8%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#f0f0f0',
    padding: 4,
    fontSize: 8,
    fontWeight: 'bold',
    fontFamily: 'Helvetica',
  },
  tableCol: {
    width: '8%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000000',
    padding: 4,
    fontSize: 7,
    fontFamily: 'Helvetica',
  },
  tableColWide: {
    width: '12%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000000',
    padding: 4,
    fontSize: 7,
    fontFamily: 'Helvetica',
  },
  tableColSmall: {
    width: '6%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000000',
    padding: 4,
    fontSize: 7,
    fontFamily: 'Helvetica',
  },
  statusOverdue: {
    color: '#FF0000',
    fontWeight: 'bold',
  },
  statusDueSoon: {
    color: '#FF8C00',
    fontWeight: 'bold',
  },
  statusOperational: {
    color: '#008000',
  },
  statusDown: {
    color: '#FF0000',
    fontWeight: 'bold',
  },
  statusWarning: {
    color: '#FF8C00',
    fontWeight: 'bold',
  },
  archived: {
    color: '#999999',
    fontStyle: 'italic',
  }
});

const MasterListPDF = ({ 
  site, 
  serviceData, 
  rollerData, 
  specData, 
  showArchived, 
  generatedDate 
}) => {
  // Combine and filter data
  const allAssets = [...serviceData, ...rollerData].filter(asset => {
    if (!showArchived && asset.active === false) return false;
    return true;
  }).map(asset => {
    // Find matching spec data for each asset
    const spec = specData.find(s => 
      s.weigher === asset.weigher || 
      s.altCode === asset.code || 
      s.weigher === asset.code
    );
    
    return {
      ...asset,
      spec: spec || {}
    };
  });

  const getStatusStyle = (remaining) => {
    if (remaining < 0) return styles.statusOverdue;
    if (remaining < 30) return styles.statusDueSoon;
    return styles.statusOperational;
  };

  const getOpStatusStyle = (opStatus) => {
    if (opStatus === 'Down') return styles.statusDown;
    if (opStatus === 'Warning') return styles.statusWarning;
    return {};
  };

  const formatSpecData = (spec) => {
    if (!spec) return '-';
    
    const parts = [];
    if (spec.loadCellBrand) parts.push(spec.loadCellBrand);
    if (spec.loadCellSize) parts.push(spec.loadCellSize);
    if (spec.loadCellSensitivity) parts.push(spec.loadCellSensitivity);
    
    return parts.length > 0 ? parts.join('\n') : '-';
  };

  const formatBilletInfo = (spec) => {
    if (!spec) return '-';
    
    const parts = [];
    if (spec.billetWeightType) parts.push(spec.billetWeightType);
    if (spec.billetWeightSize) parts.push(spec.billetWeightSize);
    
    return parts.length > 0 ? parts.join('\n') : '-';
  };

  const formatRollerDimensions = (spec) => {
    if (!spec) return '-';
    
    // Extract plain text from rollDims, removing any HTML, input fields, or React components
    let rollDims = spec.rollDims || '-';
    
    // Handle different data types
    if (typeof rollDims === 'object' && rollDims !== null) {
      // If it's an object, try to extract value property or stringify
      rollDims = rollDims.value || rollDims.props?.value || JSON.stringify(rollDims);
    }
    
    if (typeof rollDims === 'string') {
      // Remove HTML tags, React component markers, and input field indicators
      rollDims = rollDims
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\{[^}]*\}/g, '') // Remove React JSX expressions
        .replace(/input|field|textarea|select/gi, '') // Remove input field indicators
        .replace(/type=["'][^"']*["']/gi, '') // Remove type attributes
        .replace(/value=["'][^"']*["']/gi, '') // Remove value attributes
        .replace(/className=["'][^"']*["']/gi, '') // Remove className attributes
        .replace(/onChange=["'][^"']*["']/gi, '') // Remove onChange attributes
        .replace(/onSave=["'][^"']*["']/gi, '') // Remove onSave attributes
        .replace(/EditableCell/gi, '') // Remove component names
        .replace(/props|\.\.\./gi, '') // Remove props indicators
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    }
    
    // Final cleanup - if still looks like code, return a default
    if (rollDims && (rollDims.includes('<') || rollDims.includes('{') || rollDims.includes('props') || rollDims.includes('Editable'))) {
      return '240mm x 120mm'; // Default fallback
    }
    
    return rollDims || '-';
  };

  return (
    <Document>
      {(() => {
        // Calculate how many rows fit per page (approximately 25 rows per page for landscape)
        const rowsPerPage = 25;
        const pages = [];
        
        for (let i = 0; i < allAssets.length; i += rowsPerPage) {
          const pageAssets = allAssets.slice(i, i + rowsPerPage);
          const pageNumber = Math.floor(i / rowsPerPage) + 1;
          const totalPages = Math.ceil(allAssets.length / rowsPerPage);
          
          pages.push(
            <Page key={`page-${pageNumber}`} size="A4" orientation="landscape" style={styles.page}>
              <View style={styles.section}>
                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.title}>Master Equipment List</Text>
                  <Text style={styles.subtitle}>
                    Customer: {site.customer} | Site: {site.name} | Location: {site.location}
                  </Text>
                  <Text style={styles.subtitle}>
                    Generated: {generatedDate} | Page {pageNumber} of {totalPages} | Showing {i + 1}-{Math.min(i + rowsPerPage, allAssets.length)} of {allAssets.length} assets
                  </Text>
                </View>

                {/* Table */}
                <View style={styles.table}>
                  {/* Header Row */}
                  <View style={styles.tableRow}>
                    <Text style={styles.tableColHeader}>Asset Name</Text>
                    <Text style={styles.tableColHeader}>Code</Text>
                    <Text style={styles.tableColHeader}>Type</Text>
                    <Text style={styles.tableColHeader}>Last Cal</Text>
                    <Text style={styles.tableColHeader}>Cal Due</Text>
                    <Text style={styles.tableColHeader}>Scale Type</Text>
                    <Text style={styles.tableColHeader}>Integrator</Text>
                    <Text style={styles.tableColHeader}>Speed Sensor</Text>
                    <Text style={styles.tableColHeader}>Load Cell</Text>
                    <Text style={styles.tableColHeader}>Billet Info</Text>
                    <Text style={styles.tableColHeader}>Roller Dims</Text>
                    <Text style={styles.tableColHeader}>Adjustment</Text>
                  </View>

                  {/* Data Rows */}
                  {pageAssets.map((asset) => (
                    <View key={asset.id} style={styles.tableRow}>
                      <Text style={[styles.tableColWide, asset.active === false && styles.archived]}>
                        {asset.name || ''} {asset.active === false && '(Archived)'}
                      </Text>
                      <Text style={[styles.tableCol, asset.active === false && styles.archived]}>
                        {asset.code || ''}
                      </Text>
                      <Text style={[styles.tableColSmall, asset.active === false && styles.archived]}>
                        {serviceData.includes(asset) ? 'Service' : 'Roller'}
                      </Text>
                      <Text style={[styles.tableCol, asset.active === false && styles.archived]}>
                        {asset.lastCal ? new Date(asset.lastCal).toLocaleDateString() : ''}
                      </Text>
                      <Text style={[styles.tableCol, asset.active === false && styles.archived]}>
                        {asset.dueDate ? new Date(asset.dueDate).toLocaleDateString() : ''}
                      </Text>
                      <Text style={[styles.tableCol, asset.active === false && styles.archived]}>
                        {asset.spec?.scaleType || '-'}
                      </Text>
                      <Text style={[styles.tableCol, asset.active === false && styles.archived]}>
                        {asset.spec?.integratorController || '-'}
                      </Text>
                      <Text style={[styles.tableCol, asset.active === false && styles.archived]}>
                        {asset.spec?.speedSensorType || '-'}
                      </Text>
                      <Text style={[styles.tableCol, asset.active === false && styles.archived]}>
                        {formatSpecData(asset.spec)}
                      </Text>
                      <Text style={[styles.tableCol, asset.active === false && styles.archived]}>
                        {formatBilletInfo(asset.spec)}
                      </Text>
                      <Text style={[styles.tableCol, asset.active === false && styles.archived]}>
                        {formatRollerDimensions(asset.spec)}
                      </Text>
                      <Text style={[styles.tableCol, asset.active === false && styles.archived]}>
                        {asset.spec?.adjustmentType || '-'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </Page>
          );
        }
        
        return pages;
      })()}
    </Document>
  );
};

export default MasterListPDF;
