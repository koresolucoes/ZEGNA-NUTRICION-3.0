import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Svg, Line, Polyline, Circle, G } from '@react-pdf/renderer';
import { Person, NutritionistProfile, Clinic, ConsultationWithLabs, DietLog, ExerciseLog } from '../../types';

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingLeft: 40,
    paddingRight: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: '#1f2937'
  },
  // Header Section
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingBottom: 15
  },
  logoContainer: {
    width: 60,
    height: 60,
    marginRight: 15
  },
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    borderRadius: 4
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center'
  },
  clinicName: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#111827',
    marginBottom: 4
  },
  clinicDetails: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 1
  },
  
  // Patient Info Bar
  patientBar: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  patientInfoItem: {
    flex: 1,
  },
  patientLabel: {
    fontSize: 7,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 2,
    fontWeight: 'bold'
  },
  patientValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937'
  },

  // Section Headers
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0284C7',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0284C7', // Blue underline
    paddingBottom: 4
  },

  // Summary Grid (Weight, BMI, Goal)
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff', // White bg for contrast
    padding: 10,
    // borderLeftWidth: 3,
    // borderLeftColor: '#0284C7'
  },
  summaryLabel: {
    fontSize: 8,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 4,
    fontWeight: 'bold'
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827'
  },
  summarySub: {
    fontSize: 8,
    color: '#059669', // Green for success/change
    marginTop: 2
  },

  // Tables
  tableContainer: {
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb', // Very light gray
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 6,
    alignItems: 'center'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 6,
    alignItems: 'center'
  },
  col1: { width: '25%', paddingLeft: 8 }, // Date/Param
  col2: { width: '25%', textAlign: 'center' }, // Value
  col3: { width: '25%', textAlign: 'center' }, // Ref/BMI
  col4: { width: '25%', textAlign: 'center', paddingRight: 8 }, // Status/Note
  
  th: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#4b5563',
    textTransform: 'uppercase'
  },
  td: {
    fontSize: 9,
    color: '#1f2937'
  },

  // Footer / Notes
  notesContainer: {
    marginTop: 10,
    marginBottom: 40,
    padding: 10,
    backgroundColor: '#fff',
  },
  notesText: {
    fontSize: 9,
    color: '#4b5563',
    lineHeight: 1.5,
    fontStyle: 'italic'
  },
  
  // Signature
  signatureContainer: {
    marginTop: 50,
    alignItems: 'center'
  },
  signatureLine: {
    width: 200,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    marginBottom: 8
  },
  signatureName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
    textTransform: 'uppercase'
  },
  signatureTitle: {
    fontSize: 8,
    color: '#6b7280'
  },

  // Page Footer (Fixed at bottom)
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    textAlign: 'center',
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10
  },

  // Chart
  chartWrapper: {
    marginTop: 20,
    marginBottom: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4
  }
});

// --- CHART COMPONENT ---
const PDFChart = ({ data, title, color = '#0284C7', width = 500, height = 150, unit = '' }: any) => {
  if (!data || data.length < 2) return null;
  
  const padding = 20;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;
  
  const values = data.map((d: any) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const buffer = (maxVal - minVal) * 0.1 || 1; 
  const yMin = Math.max(0, minVal - buffer);
  const yMax = maxVal + buffer;
  const range = yMax - yMin;
  
  const points = data.map((d: any, i: number) => {
    const x = padding + (i / (data.length - 1)) * graphWidth;
    const y = height - padding - ((d.value - yMin) / range) * graphHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <View style={styles.chartWrapper}>
      <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 10, color: '#374151', textAlign: 'center' }}>{title}</Text>
      <Svg width={width} height={height}>
        {/* Grid Lines */}
        <Line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" strokeWidth={1} />
        <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth={1} />
        
        {/* Data Line */}
        <Polyline points={points} stroke={color} strokeWidth={2} fill="none" />
        
        {/* Data Points */}
        {data.map((d: any, i: number) => {
           const x = padding + (i / (data.length - 1)) * graphWidth;
           const y = height - padding - ((d.value - yMin) / range) * graphHeight;
           // Show label for first, last, and points in between to avoid crowd
           const showLabel = i === 0 || i === data.length - 1 || data.length < 10;

           return (
             <G key={i}>
                <Circle cx={x} cy={y} r={2.5} fill="#ffffff" stroke={color} strokeWidth={2} />
                {showLabel && (
                    <Text x={x - 10} y={y - 8} style={{ fontSize: 7, fill: '#4b5563' }}>
                        {d.value.toFixed(1)}{unit}
                    </Text>
                )}
             </G>
           )
        })}
      </Svg>
    </View>
  );
};

interface MedicalReportDocumentProps {
  person: Person;
  nutritionistProfile: NutritionistProfile | null;
  clinic: Clinic | null;
  consultations: ConsultationWithLabs[];
  dietLogs: DietLog[];
  exerciseLogs: ExerciseLog[];
  reportData: any;
  options: {
    page1_results: boolean;
    page2_charts: boolean;
    page3_tables: boolean;
    page4_welcome: boolean;
  };
}

const MedicalReportDocument: React.FC<MedicalReportDocumentProps> = ({ 
  person, nutritionistProfile, clinic, consultations, dietLogs, exerciseLogs, reportData, options 
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

  const sortedConsultations = [...consultations].sort((a, b) => new Date(b.consultation_date).getTime() - new Date(a.consultation_date).getTime()); // Descending for history table
  const ascConsultations = [...consultations].sort((a, b) => new Date(a.consultation_date).getTime() - new Date(b.consultation_date).getTime()); // Ascending for charts

  const weightData = ascConsultations.filter(c => c.weight_kg != null).map(c => ({ date: c.consultation_date, value: c.weight_kg! }));
  const imcData = ascConsultations.filter(c => c.imc != null).map(c => ({ date: c.consultation_date, value: c.imc! }));

  const latestDiet = dietLogs[0];
  const latestExercise = exerciseLogs[0];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.headerContainer} fixed>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
             {clinic?.logo_url && (
                <View style={styles.logoContainer}>
                   {/* eslint-disable-next-line jsx-a11y/alt-text */}
                   <Image src={clinic.logo_url} style={styles.logo} />
                </View>
             )}
             <View style={styles.headerTextContainer}>
                 <Text style={styles.clinicName}>{clinic?.name || 'ZEGNA NUTRICIÓN'}</Text>
                 <Text style={styles.clinicDetails}>{clinic?.address || ''}</Text>
                 <Text style={styles.clinicDetails}>{clinic?.phone_number || ''} {clinic?.email ? `| ${clinic.email}` : ''}</Text>
             </View>
          </View>
          <View style={{alignItems: 'flex-end', justifyContent: 'center'}}>
             <Text style={{fontSize: 9, color: '#9ca3af'}}>EXPEDIENTE NÚM.</Text>
             <Text style={{fontSize: 12, fontWeight: 'bold', color: '#111827'}}>{person.folio || 'N/A'}</Text>
          </View>
        </View>

        {/* PATIENT INFO BAR */}
        <View style={styles.patientBar}>
          <View style={styles.patientInfoItem}>
            <Text style={styles.patientLabel}>PACIENTE</Text>
            <Text style={styles.patientValue}>{person.full_name.toUpperCase()}</Text>
          </View>
          <View style={{...styles.patientInfoItem, flex: 0.5}}>
            <Text style={styles.patientLabel}>EDAD / GÉNERO</Text>
            <Text style={styles.patientValue}>{calculateAge(person.birth_date)} / {person.gender === 'male' ? 'MASC' : 'FEM'}</Text>
          </View>
          <View style={{...styles.patientInfoItem, flex: 0.5}}>
            <Text style={styles.patientLabel}>FECHA REPORTE</Text>
            <Text style={styles.patientValue}>{new Date().toLocaleDateString('es-MX')}</Text>
          </View>
        </View>

        {/* PAGE 1 CONTENT: RESUMEN CLÍNICO */}
        {options.page1_results && (
          <View>
            <Text style={styles.sectionTitle}>RESUMEN CLÍNICO</Text>

            {/* Metrics Grid */}
            <View style={styles.summaryGrid}>
               <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>PESO ACTUAL</Text>
                    <Text style={{...styles.summaryValue, color: '#0284C7'}}>{reportData.pesoActual ? `${reportData.pesoActual} kg` : '-'}</Text>
                    <Text style={styles.summarySub}>
                        {reportData.perdidaPeso ? `Cambio: ${reportData.perdidaPeso}` : 'Inicio'}
                    </Text>
               </View>
               <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>IMC ACTUAL</Text>
                    <Text style={styles.summaryValue}>{reportData.imcActual || '-'}</Text>
                    <Text style={{fontSize: 8, color: '#6b7280', marginTop: 2}}>kg/m²</Text>
               </View>
               <View style={{...styles.summaryCard, flex: 2}}>
                    <Text style={styles.summaryLabel}>OBJETIVO DE SALUD</Text>
                    <Text style={{...styles.summaryValue, fontSize: 10, fontWeight: 'normal'}}>{person.health_goal || 'Sin especificar'}</Text>
               </View>
            </View>

            {/* Lab Results Table (if available) */}
            <View style={styles.tableContainer}>
                 <View style={styles.tableHeader}>
                    <Text style={[styles.th, styles.col1]}>PARÁMETRO</Text>
                    <Text style={[styles.th, styles.col2]}>VALOR</Text>
                    <Text style={[styles.th, styles.col3]}>REFERENCIA</Text>
                    <Text style={[styles.th, styles.col4]}>ESTADO</Text>
                 </View>
                 <View style={styles.tableRow}>
                    <Text style={[styles.td, styles.col1]}>Glucosa Capilar</Text>
                    <Text style={[styles.td, styles.col2]}>{reportData.glucosaCapilar ? `${reportData.glucosaCapilar} mg/dL` : '-'}</Text>
                    <Text style={[styles.td, styles.col3]}>{'< 100'}</Text>
                    <Text style={[styles.td, styles.col4, {color: reportData.glucosaCapilar > 100 ? '#EF4444' : '#10B981', fontWeight: 'bold'}]}>
                        {!reportData.glucosaCapilar ? '-' : reportData.glucosaCapilar > 100 ? 'ALTO' : 'NORMAL'}
                    </Text>
                 </View>
                 <View style={{...styles.tableRow, borderBottomWidth: 0}}>
                    <Text style={[styles.td, styles.col1]}>Colesterol Total</Text>
                    <Text style={[styles.td, styles.col2]}>{reportData.colesterolActual ? `${reportData.colesterolActual} mg/dL` : '-'}</Text>
                    <Text style={[styles.td, styles.col3]}>{'< 200'}</Text>
                    <Text style={[styles.td, styles.col4, {color: reportData.colesterolActual > 200 ? '#EF4444' : '#10B981', fontWeight: 'bold'}]}>
                         {!reportData.colesterolActual ? '-' : reportData.colesterolActual > 200 ? 'ALTO' : 'NORMAL'}
                    </Text>
                 </View>
            </View>

            {/* Progress History Table (New Requirement) */}
            <Text style={styles.sectionTitle}>HISTORIAL DE PROGRESO</Text>
            <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.th, styles.col1]}>FECHA</Text>
                    <Text style={[styles.th, styles.col2]}>PESO (KG)</Text>
                    <Text style={[styles.th, styles.col3]}>IMC</Text>
                    <Text style={[styles.th, styles.col4]}>TALLA (CM)</Text> 
                    {/* Using Talla instead of Cintura/Grasa for now as they aren't in main Consult type */}
                </View>
                {sortedConsultations.slice(0, 8).map((consult, idx) => (
                    <View key={idx} style={{...styles.tableRow, borderBottomWidth: idx === sortedConsultations.length - 1 ? 0 : 1}}>
                        <Text style={[styles.td, styles.col1]}>{new Date(consult.consultation_date).toLocaleDateString('es-MX')}</Text>
                        <Text style={[styles.td, styles.col2]}>{consult.weight_kg}</Text>
                        <Text style={[styles.td, styles.col3]}>{consult.imc}</Text>
                        <Text style={[styles.td, styles.col4]}>{consult.height_cm || '-'}</Text>
                    </View>
                ))}
                {sortedConsultations.length === 0 && (
                     <View style={{padding: 10}}><Text style={{textAlign: 'center', fontSize: 9, color: '#9ca3af', fontStyle: 'italic'}}>No hay historial disponible.</Text></View>
                )}
            </View>

            {/* Notas Finales */}
            {options.page4_welcome && (
                <View>
                    <Text style={styles.sectionTitle}>NOTAS FINALES</Text>
                    <View style={styles.notesContainer}>
                        <Text style={styles.notesText}>
                            Este reporte es un resumen de tu estado actual. Te recomendamos seguir las indicaciones de tu plan alimenticio personalizado y mantener una comunicación constante con tu especialista ante cualquier duda. Recuerda que los resultados sostenibles requieren tiempo, paciencia y constancia.
                        </Text>
                    </View>

                    <View style={styles.signatureContainer}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureName}>{nutritionistProfile?.full_name || 'NUTRIÓLOGO'}</Text>
                        <Text style={styles.signatureTitle}>{nutritionistProfile?.professional_title || 'NUTRICIÓN CLÍNICA Y DEPORTIVA'}</Text>
                        {nutritionistProfile?.license_number && <Text style={styles.signatureTitle}>Céd. Prof. {nutritionistProfile.license_number}</Text>}
                    </View>
                </View>
            )}
          </View>
        )}

        {/* SECTION 2: GRAPHICS (Separate Page if requested) */}
        {options.page2_charts && weightData.length > 1 && (
            <View break>
                 <Text style={styles.sectionTitle}>GRÁFICAS DE EVOLUCIÓN</Text>
                 <PDFChart data={weightData} title="Evolución de Peso (kg)" color="#0284C7" unit="kg" />
                 <PDFChart data={imcData} title="Evolución de IMC" color="#8B5CF6" />
            </View>
        )}

        {/* SECTION 3: CURRENT PLAN (Separate Page if requested) */}
        {options.page3_tables && latestDiet && (
            <View break>
                <Text style={styles.sectionTitle}>PLAN DE ALIMENTACIÓN ACTUAL</Text>
                
                 <View style={{marginBottom: 15}}>
                    <Text style={{fontSize: 9, color: '#6b7280', marginBottom: 5}}>ASIGNADO EL: {new Date(latestDiet.log_date).toLocaleDateString()}</Text>
                 </View>

                 <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.th, {width: '20%', paddingLeft: 8}]}>TIEMPO</Text>
                        <Text style={[styles.th, {width: '80%', paddingLeft: 8}]}>MENÚ SUGERIDO</Text>
                    </View>
                    {latestDiet.desayuno && (
                        <View style={styles.tableRow}>
                            <Text style={[styles.td, {width: '20%', paddingLeft: 8, fontWeight: 'bold'}]}>DESAYUNO</Text>
                            <Text style={[styles.td, {width: '80%', paddingLeft: 8}]}>{latestDiet.desayuno}</Text>
                        </View>
                    )}
                    {latestDiet.colacion_1 && (
                        <View style={styles.tableRow}>
                            <Text style={[styles.td, {width: '20%', paddingLeft: 8, fontWeight: 'bold'}]}>COLACIÓN 1</Text>
                            <Text style={[styles.td, {width: '80%', paddingLeft: 8}]}>{latestDiet.colacion_1}</Text>
                        </View>
                    )}
                     {latestDiet.comida && (
                        <View style={styles.tableRow}>
                            <Text style={[styles.td, {width: '20%', paddingLeft: 8, fontWeight: 'bold'}]}>COMIDA</Text>
                            <Text style={[styles.td, {width: '80%', paddingLeft: 8}]}>{latestDiet.comida}</Text>
                        </View>
                    )}
                     {latestDiet.colacion_2 && (
                        <View style={styles.tableRow}>
                            <Text style={[styles.td, {width: '20%', paddingLeft: 8, fontWeight: 'bold'}]}>COLACIÓN 2</Text>
                            <Text style={[styles.td, {width: '80%', paddingLeft: 8}]}>{latestDiet.colacion_2}</Text>
                        </View>
                    )}
                     {latestDiet.cena && (
                        <View style={{...styles.tableRow, borderBottomWidth: 0}}>
                            <Text style={[styles.td, {width: '20%', paddingLeft: 8, fontWeight: 'bold'}]}>CENA</Text>
                            <Text style={[styles.td, {width: '80%', paddingLeft: 8}]}>{latestDiet.cena}</Text>
                        </View>
                    )}
                 </View>

                 {latestExercise && (
                     <View style={{marginTop: 20}}>
                        <Text style={styles.sectionTitle}>RUTINA DE EJERCICIO</Text>
                        <View style={{backgroundColor: '#f9fafb', padding: 10, borderRadius: 4, borderWidth: 1, borderColor: '#f3f4f6'}}>
                            <Text style={{fontSize: 10, fontWeight: 'bold', marginBottom: 5}}>{latestExercise.enfoque || 'General'}</Text>
                             {Array.isArray(latestExercise.ejercicios) && latestExercise.ejercicios.length > 0 ? (
                                (latestExercise.ejercicios as any[]).map((ex, idx) => (
                                    <Text key={idx} style={{fontSize: 9, marginBottom: 4}}>
                                        • {ex.nombre}: {ex.series} series, {ex.repeticiones} reps.
                                    </Text>
                                ))
                            ) : (
                                <Text style={{fontSize: 9, fontStyle: 'italic'}}>Sin ejercicios detallados.</Text>
                            )}
                        </View>
                     </View>
                 )}
            </View>
        )}
        
        <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
          `Página ${pageNumber} de ${totalPages} | ${clinic?.name || 'Zegna Nutrición'} | ${new Date().toLocaleDateString()}`
        )} fixed />

      </Page>
    </Document>
  );
};

export default MedicalReportDocument;