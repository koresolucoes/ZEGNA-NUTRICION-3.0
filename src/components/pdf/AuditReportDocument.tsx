
import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: '#1f2937'
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4
  },
  meta: {
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'right'
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
    minHeight: 24,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
  },
  tableCol: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e5e7eb',
    padding: 5,
  },
  // Column widths
  colDate: { width: '15%' },
  colType: { width: '15%' },
  colDesc: { width: '40%' },
  colUser: { width: '15%' },
  colPatient: { width: '15%' },
  
  cellText: {
    fontSize: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  }
});

interface AuditReportDocumentProps {
  logs: any[];
  clinicName: string;
  dateRange: string;
}

const AuditReportDocument: React.FC<AuditReportDocumentProps> = ({ logs, clinicName, dateRange }) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      
      {/* Header */}
      <View style={styles.header}>
        <View>
            <Text style={styles.title}>Reporte de Auditoría</Text>
            <Text style={styles.subtitle}>{clinicName}</Text>
        </View>
        <View>
            <Text style={styles.meta}>Generado el: {new Date().toLocaleDateString()}</Text>
            <Text style={styles.meta}>Rango: {dateRange}</Text>
            <Text style={styles.meta}>Registros: {logs.length}</Text>
        </View>
      </View>

      {/* Table Header */}
      <View style={[styles.table, styles.tableHeader, styles.tableRow]}>
        <View style={[styles.tableCol, styles.colDate]}>
          <Text style={styles.cellText}>FECHA Y HORA</Text>
        </View>
        <View style={[styles.tableCol, styles.colType]}>
          <Text style={styles.cellText}>TIPO</Text>
        </View>
        <View style={[styles.tableCol, styles.colDesc]}>
          <Text style={styles.cellText}>DESCRIPCIÓN</Text>
        </View>
        <View style={[styles.tableCol, styles.colPatient]}>
          <Text style={styles.cellText}>PACIENTE</Text>
        </View>
        <View style={[styles.tableCol, styles.colUser]}>
          <Text style={styles.cellText}>USUARIO</Text>
        </View>
      </View>

      {/* Table Body */}
      {logs.map((log, index) => (
        <View key={index} style={[styles.table, styles.tableRow, { backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }]}>
          <View style={[styles.tableCol, styles.colDate]}>
            <Text style={styles.cellText}>
                {new Date(log.created_at).toLocaleString('es-MX')}
            </Text>
          </View>
          <View style={[styles.tableCol, styles.colType]}>
            <Text style={styles.cellText}>{log.log_type}</Text>
          </View>
          <View style={[styles.tableCol, styles.colDesc]}>
            <Text style={styles.cellText}>{log.description}</Text>
          </View>
          <View style={[styles.tableCol, styles.colPatient]}>
            <Text style={styles.cellText}>{log.person_name}</Text>
          </View>
          <View style={[styles.tableCol, styles.colUser]}>
            <Text style={styles.cellText}>{log.professional_name}</Text>
          </View>
        </View>
      ))}

      {/* Footer */}
      <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
        `Página ${pageNumber} de ${totalPages} | Documento Confidencial - Uso Interno`
      )} fixed />
    </Page>
  </Document>
);

export default AuditReportDocument;
