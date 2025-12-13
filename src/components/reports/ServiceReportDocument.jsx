import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// Define styles to match Accurate Industries branding
const styles = StyleSheet.create({
    page: { padding: 30, fontFamily: 'Helvetica', fontSize: 9, color: '#333' },
    header: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#ccc', paddingBottom: 10 },
    logoSection: { width: '40%' },
    titleSection: { width: '60%', textAlign: 'right', alignItems: 'flex-end' },
    companyName: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50' },
    reportTitle: { fontSize: 18, fontWeight: 'bold', color: '#e67e22', marginTop: 5 },

    // Section Styles
    sectionTitle: { fontSize: 11, fontWeight: 'bold', backgroundColor: '#f3f4f6', padding: 4, marginTop: 10, marginBottom: 5 },
    row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#eee', minHeight: 14, alignItems: 'center' },

    // Table Styles
    tableHeader: { backgroundColor: '#2c3e50', color: 'white', flexDirection: 'row', padding: 4, fontSize: 8, fontWeight: 'bold' },
    colLabel: { width: '30%', paddingRight: 5, fontSize: 8, color: '#666' },
    colValue: { width: '70%', fontSize: 9, fontWeight: 'bold' },

    // Grid for the "As Found / As Left" data
    gridRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 3 },
    gridColLabel: { width: '40%', fontSize: 8 },
    gridColVal: { width: '20%', textAlign: 'center', fontSize: 8 },
    gridColDiff: { width: '20%', textAlign: 'center', fontSize: 8, color: '#666' },

    // Footer
    footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', fontSize: 8, color: '#999', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 }
});

export const ServiceReportDocument = ({ data }) => {
    const { general, calibration, integrator } = data;

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* HEADER */}
                <View style={styles.header}>
                    <View style={styles.logoSection}>
                        <Text style={styles.companyName}>ACCURATE INDUSTRIES</Text>
                        <Text style={{ fontSize: 8, marginTop: 4 }}>ABN 99 657 158 524</Text>
                    </View>
                    <View style={styles.titleSection}>
                        {/* {general.customerLogo && (
                            <Image
                                src={general.customerLogo}
                                style={{ height: 40, marginBottom: 5 }}
                            />
                        )} */}
                        <Text style={styles.reportTitle}>Belt Weigher Report</Text>
                        <Text style={{ fontSize: 10, color: '#666' }}>{general.reportId}</Text>
                    </View>
                </View>

                {/* CUSTOMER & SERVICE INFO */}
                <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                    <View style={{ width: '50%', paddingRight: 10 }}>
                        <Text style={styles.sectionTitle}>Customer Details</Text>
                        <View style={styles.row}><Text style={styles.colLabel}>Customer:</Text><Text style={styles.colValue}>{general.customerName}</Text></View>
                        <View style={styles.row}><Text style={styles.colLabel}>Site:</Text><Text style={styles.colValue}>{general.siteLocation}</Text></View>
                        <View style={styles.row}><Text style={styles.colLabel}>Contact:</Text><Text style={styles.colValue}>{general.contactName}</Text></View>
                        <View style={styles.row}><Text style={styles.colLabel}>Email:</Text><Text style={styles.colValue}>{general.contactEmail}</Text></View>
                    </View>
                    <View style={{ width: '50%', paddingLeft: 10 }}>
                        <Text style={styles.sectionTitle}>Service Information</Text>
                        <View style={styles.row}><Text style={styles.colLabel}>Asset:</Text><Text style={styles.colValue}>{general.assetName} ({general.conveyorNumber})</Text></View>
                        <View style={styles.row}><Text style={styles.colLabel}>Date:</Text><Text style={styles.colValue}>{general.serviceDate}</Text></View>
                        <View style={styles.row}><Text style={styles.colLabel}>Techs:</Text><Text style={styles.colValue}>{general.technicians}</Text></View>
                        <View style={styles.row}><Text style={styles.colLabel}>Next Due:</Text><Text style={styles.colValue}>{general.nextServiceDate}</Text></View>
                    </View>
                </View>

                {/* CRITICAL CALIBRATION RESULTS */}
                <Text style={styles.sectionTitle}>Critical Calibration Results</Text>
                <View style={styles.tableHeader}>
                    <Text style={{ width: data.showPercentChange !== false ? '25%' : '35%' }}>Parameter</Text>
                    <Text style={{ width: data.showPercentChange !== false ? '25%' : '32.5%', textAlign: 'center' }}>Old (As Found)</Text>
                    <Text style={{ width: data.showPercentChange !== false ? '25%' : '32.5%', textAlign: 'center' }}>New (As Left)</Text>
                    {data.showPercentChange !== false && <Text style={{ width: '25%', textAlign: 'center' }}>% Change</Text>}
                </View>

                {(data.calibrationRows || []).map((row, i) => {
                    // Calculate percent if not manual/provided
                    let displayPercent = row.percentChange;
                    if (displayPercent === null || displayPercent === undefined) {
                        const o = parseFloat(row.oldValue);
                        const n = parseFloat(row.newValue);
                        if (!o || o === 0) displayPercent = '0.00';
                        else displayPercent = (((n - o) / o) * 100).toFixed(2);
                    }

                    const percentValue = parseFloat(displayPercent);
                    const isHighChange = Math.abs(percentValue) > 1;

                    return (
                        <View key={i} style={styles.gridRow}>
                            <Text style={styles.gridColLabel}>{row.parameter}</Text>
                            <Text style={styles.gridColVal}>{row.oldValue}</Text>
                            <Text style={styles.gridColVal}>{row.newValue}</Text>
                            {data.showPercentChange !== false && (
                                <Text style={{
                                    ...styles.gridColDiff,
                                    color: isHighChange ? '#dc2626' : '#666'
                                }}>
                                    {displayPercent}%
                                </Text>
                            )}
                        </View>
                    );
                })}

                {/* Fallback for legacy data if calibrationRows is missing */}
                {(!data.calibrationRows || data.calibrationRows.length === 0) && (
                    <>
                        <View style={styles.gridRow}>
                            <Text style={styles.gridColLabel}>Tare (kg/m)</Text>
                            <Text style={styles.gridColVal}>{calibration.oldTare}</Text>
                            <Text style={styles.gridColVal}>{calibration.newTare}</Text>
                            {data.showPercentChange !== false && <Text style={styles.gridColDiff}>{calibration.tareChange}%</Text>}
                        </View>
                        <View style={styles.gridRow}>
                            <Text style={styles.gridColLabel}>Span / Factor</Text>
                            <Text style={styles.gridColVal}>{calibration.oldSpan}</Text>
                            <Text style={styles.gridColVal}>{calibration.newSpan}</Text>
                            {data.showPercentChange !== false && <Text style={styles.gridColDiff}>{calibration.spanChange}%</Text>}
                        </View>
                        <View style={styles.gridRow}>
                            <Text style={styles.gridColLabel}>Belt Speed (m/s)</Text>
                            <Text style={styles.gridColVal}>{calibration.oldSpeed}</Text>
                            <Text style={styles.gridColVal}>{calibration.newSpeed}</Text>
                            {data.showPercentChange !== false && <Text style={styles.gridColDiff}>{calibration.speedChange}%</Text>}
                        </View>
                    </>
                )}

                {/* INTEGRATOR DATA (Comparison Table) */}
                <Text style={styles.sectionTitle}>Integrator Data & Checks</Text>
                <View style={{ flexDirection: 'row', backgroundColor: '#e5e7eb', padding: 4 }}>
                    <Text style={{ width: '40%', fontSize: 8, fontWeight: 'bold' }}>Description</Text>
                    <Text style={{ width: '20%', fontSize: 8, fontWeight: 'bold', textAlign: 'center' }}>As Found</Text>
                    <Text style={{ width: '20%', fontSize: 8, fontWeight: 'bold', textAlign: 'center' }}>As Left</Text>
                    <Text style={{ width: '20%', fontSize: 8, fontWeight: 'bold', textAlign: 'center' }}>Difference</Text>
                </View>

                {(integrator || []).map((row, i) => (
                    <View key={i} style={styles.gridRow}>
                        <Text style={styles.gridColLabel}>{row.label}</Text>
                        <Text style={styles.gridColVal}>{row.asFound}</Text>
                        <Text style={styles.gridColVal}>{row.asLeft}</Text>
                        <Text
                            style={{
                                ...styles.gridColDiff,
                                color: row.diff !== '0' && row.diff !== '0.00' && row.diff !== '-' ? '#dc2626' : '#666'
                            }}
                        >
                            {row.diff}
                        </Text>
                    </View>
                ))}

                {/* COMMENTS */}
                <Text style={styles.sectionTitle}>Comments & Recommendations</Text>
                <View style={{ padding: 5, border: '1px solid #eee', minHeight: 60 }}>
                    <Text style={{ fontSize: 9, lineHeight: 1.5 }}>{general.comments || 'No comments provided.'}</Text>
                </View>

                {/* FOOTER */}
                <View style={styles.footer}>
                    <Text>Accurate Industries | 6/23 Ashtan Pl, Banyo QLD 4014 | www.accurateindustries.com.au</Text>
                    <Text>Page 1 of 1</Text>
                </View>
            </Page>
        </Document>
    );
};
