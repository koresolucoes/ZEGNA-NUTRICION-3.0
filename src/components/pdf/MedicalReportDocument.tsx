import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { Person, NutritionistProfile, Clinic, ConsultationWithLabs } from '../../types';

// Registrar fuentes para asegurar consistencia
Font.register({
  family: 'Inter',
  src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.ttf'
});

const styles = StyleSheet.create({
  page: {
    padding: 30, // Reduced margins
    paddingBottom: 50,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    paddingBottom: 10,
  },
  logo: {
    width: 50,
    height: 50,
    objectFit: 'contain',
  },
  clinicInfo: {
    textAlign: 'right',
    fontSize: 8,
    color: '#555555',
  },
  clinicName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0284C7',
    marginTop: 15,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    paddingBottom: 2,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  col2: {
    width: '50%',
  },
  col3: {
    width: '33.33%',
  },
  label: {
    fontWeight: 'bold',
    color: '#555555',
    marginBottom: 2,
    fontSize: 8,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 10,
    color: '#000000',
    marginBottom: 6,
  },
  table: {
    display: 'flex',
    width: 'auto',
    marginTop: 10,
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderColor: '#e0e0e0',
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
    minHeight: 20,
    alignItems: 'center',
  },
  tableColHeader: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    padding: 4,
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e0e0e0',
    padding: 4,
  },
  tableCellHeader: {
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableCell: {
    fontSize: 8,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#999999',
    borderTopWidth: 1,
    borderTopColor: '#cccccc',
    paddingTop: 10,
  },
  disclaimer: {
    fontSize: 8,
    color: '#666666',
    fontStyle: 'italic',
    marginTop: 15,
    lineHeight: 1.4,
    textAlign: 'justify',
  },
  patientInfoBox: {
    marginBottom: 15,
    backgroundColor: '#f0f9ff',
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0f2fe'
  }
});

interface MedicalReportDocumentProps {
  person: Person;
  nutritionistProfile: NutritionistProfile | null;
  clinic: Clinic | null;
  consultations: ConsultationWithLabs[];
  reportData: any;
  options: {
    page1_results: boolean;
    page2_charts: boolean;
    page3_tables: boolean;
    page4_welcome: boolean;
  };
}

const MedicalReportDocument: React.FC<MedicalReportDocumentProps> = ({ 
  person, nutritionistProfile, clinic, consultations, reportData, options 
}) => {
  
  const calculateAge = (birthDate: string | null | undefined): string => {
      if (!birthDate) return 'N/A';
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      return `${age} AÑOS`;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* HEADER */}
        <View style={styles.header} fixed>
          {clinic?.logo_url && (
             // eslint-disable-next-line jsx-a11y/alt-text
             <Image src={clinic.logo_url} style={styles.logo} />
          )}
          <View style={styles.clinicInfo}>
            <Text style={styles.clinicName}>{clinic?.name || 'Zegna Nutrición'}</Text>
            <Text>{clinic?.address || ''}</Text>
            <Text>{clinic?.phone_number || ''} | {clinic?.email || ''}</Text>
          </View>
        </View>

        {/* PATIENT INFO */}
        <View style={styles.patientInfoBox} wrap={false}>
          <View style={styles.row}>
            <View style={styles.col3}>
              <Text style={styles.label}>PACIENTE</Text>
              <Text style={styles.value}>{person.full_name.toUpperCase()}</Text>
            </View>
            <View style={styles.col3}>
               <Text style={styles.label}>EDAD / GÉNERO</Text>
               <Text style={styles.value}>{calculateAge(person.birth_date)} / {person.gender === 'male' ? 'MASCULINO' : 'FEMENINO'}</Text>
            </View>
            <View style={styles.col3}>
               <Text style={styles.label}>EXPEDIENTE</Text>
               <Text style={styles.value}>{person.folio || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* SECTION 1: RESULTADOS DETALLADOS */}
        {options.page1_results && (
          <View>
            <Text style={styles.sectionTitle}>Resumen Clínico</Text>
            
            <View style={styles.row} wrap={false}>
              <View style={styles.col2}>
                <Text style={styles.label}>PESO ACTUAL</Text>
                <Text style={styles.value}>{reportData.pesoActual ? `${reportData.pesoActual} kg` : '-'}</Text>
              </View>
              <View style={styles.col2}>
                <Text style={styles.label}>PESO INICIAL</Text>
                <Text style={styles.value}>{reportData.pesoInicial ? `${reportData.pesoInicial} kg` : '-'}</Text>
              </View>
            </View>

            <View style={styles.row} wrap={false}>
               <View style={styles.col2}>
                <Text style={styles.label}>IMC ACTUAL</Text>
                <Text style={styles.value}>{reportData.imcActual || '-'}</Text>
              </View>
              <View style={styles.col2}>
                <Text style={styles.label}>CAMBIO DE PESO</Text>
                <Text style={{...styles.value, color: reportData.perdidaPeso?.includes('-') ? '#10B981' : '#000'}}>{reportData.perdidaPeso || '-'}</Text>
              </View>
            </View>

            <View style={styles.row} wrap={false}>
              <View style={styles.col2}>
                 <Text style={styles.label}>OBJETIVO DE SALUD</Text>
                 <Text style={styles.value}>{reportData.objetivoSalud || 'No especificado'}</Text>
              </View>
               <View style={styles.col2}>
                 <Text style={styles.label}>TALLA</Text>
                 <Text style={styles.value}>{reportData.talla ? `${reportData.talla} cm` : '-'}</Text>
              </View>
            </View>

            <View wrap={false}>
                <Text style={{...styles.label, marginTop: 10}}>VALORES DE LABORATORIO RECIENTES</Text>
                <View style={styles.table}>
                <View style={styles.tableRow}>
                    <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Parámetro</Text></View>
                    <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Valor</Text></View>
                    <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Referencia</Text></View>
                    <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Estado</Text></View>
                </View>
                <View style={styles.tableRow}>
                    <View style={styles.tableCol}><Text style={styles.tableCell}>Glucosa</Text></View>
                    <View style={styles.tableCol}><Text style={styles.tableCell}>{reportData.glucosaCapilar || '-'}</Text></View>
                    <View style={styles.tableCol}><Text style={styles.tableCell}>{'< 100 mg/dL'}</Text></View>
                    <View style={styles.tableCol}><Text style={styles.tableCell}>{!reportData.glucosaCapilar ? '-' : reportData.glucosaCapilar > 100 ? 'ALTO' : 'NORMAL'}</Text></View>
                </View>
                <View style={styles.tableRow}>
                    <View style={styles.tableCol}><Text style={styles.tableCell}>Colesterol</Text></View>
                    <View style={styles.tableCol}><Text style={styles.tableCell}>{reportData.colesterolActual || '-'}</Text></View>
                    <View style={styles.tableCol}><Text style={styles.tableCell}>{'< 200 mg/dL'}</Text></View>
                    <View style={styles.tableCol}><Text style={styles.tableCell}>{!reportData.colesterolActual ? '-' : reportData.colesterolActual > 200 ? 'ALTO' : 'NORMAL'}</Text></View>
                </View>
                </View>
            </View>
          </View>
        )}

        {/* SECTION 2: TABLAS DE DATOS */}
        {options.page2_charts && (
           <View>
              <Text style={styles.sectionTitle}>Historial de Progreso</Text>
              <View style={styles.table}>
                <View style={styles.tableRow}>
                  <View style={{...styles.tableColHeader, width: '20%'}}><Text style={styles.tableCellHeader}>Fecha</Text></View>
                  <View style={{...styles.tableColHeader, width: '20%'}}><Text style={styles.tableCellHeader}>Peso (kg)</Text></View>
                  <View style={{...styles.tableColHeader, width: '20%'}}><Text style={styles.tableCellHeader}>IMC</Text></View>
                  <View style={{...styles.tableColHeader, width: '20%'}}><Text style={styles.tableCellHeader}>Cintura (cm)</Text></View>
                  <View style={{...styles.tableColHeader, width: '20%'}}><Text style={styles.tableCellHeader}>Grasa (%)</Text></View>
                </View>
                {consultations.slice(0, 20).map((c, i) => (
                   <View style={styles.tableRow} key={i} wrap={false}>
                      <View style={{...styles.tableCol, width: '20%'}}><Text style={styles.tableCell}>{new Date(c.consultation_date).toLocaleDateString()}</Text></View>
                      <View style={{...styles.tableCol, width: '20%'}}><Text style={styles.tableCell}>{c.weight_kg || '-'}</Text></View>
                      <View style={{...styles.tableCol, width: '20%'}}><Text style={styles.tableCell}>{c.imc || '-'}</Text></View>
                      <View style={{...styles.tableCol, width: '20%'}}><Text style={styles.tableCell}>{'-'}</Text></View>
                      <View style={{...styles.tableCol, width: '20%'}}><Text style={styles.tableCell}>{'-'}</Text></View>
                   </View>
                ))}
              </View>
           </View>
        )}

        {/* SECTION 3: MENSAJE DE CIERRE */}
        {options.page4_welcome && (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>Notas Finales</Text>
            <Text style={styles.disclaimer}>
              Este reporte es un resumen de tu estado actual. Te recomendamos seguir las indicaciones de tu plan alimenticio personalizado y mantener una comunicación constante con tu especialista ante cualquier duda. Recuerda que los resultados sostenibles requieren tiempo, paciencia y constancia.
            </Text>

            <View style={{ marginTop: 40, alignItems: 'center' }}>
              <View style={{ borderBottomWidth: 1, borderBottomColor: '#000', width: 150, marginBottom: 5 }} />
              <Text style={{ fontWeight: 'bold', fontSize: 10 }}>{nutritionistProfile?.full_name || 'Nutriólogo'}</Text>
              <Text style={{ fontSize: 9 }}>{nutritionistProfile?.professional_title || 'Especialista en Nutrición'}</Text>
              {nutritionistProfile?.license_number && (
                 <Text style={{ fontSize: 9 }}>Céd. Prof. {nutritionistProfile.license_number}</Text>
              )}
            </View>
          </View>
        )}

        {/* FOOTER */}
        <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
          `Página ${pageNumber} de ${totalPages} | ${clinic?.name || 'Zegna Nutrición'} | ${new Date().toLocaleDateString()}`
        )} fixed />
      </Page>
    </Document>
  );
};

export default MedicalReportDocument;