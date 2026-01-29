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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 10,
  },
  logo: {
    width: 50,
    height: 50,
    objectFit: 'contain',
    borderRadius: 8
  },
  clinicInfo: {
    textAlign: 'right',
  },
  clinicName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  clinicMeta: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 1
  },
  // Updated Section Title to match screenshot (Blue, Uppercase, Underlined)
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0284C7',
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0284C7', // Blue underline
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  subTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 10,
    marginBottom: 6,
  },
  // Metrics Grid
  metricsContainer: {
    flexDirection: 'row',
    marginBottom: 25,
    marginTop: 10,
  },
  metricBox: {
    flex: 1,
    paddingRight: 10,
  },
  metricLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  metricValueLarge: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  metricSubtext: {
    fontSize: 9,
    fontWeight: 'medium',
  },
  
  patientInfoBox: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f9fafb', // Lighter gray
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  col2: {
    width: '50%',
  },
  label: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  
  // Table Styles
  table: {
    display: 'flex',
    width: 'auto',
    marginTop: 5,
    marginBottom: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    overflow: 'hidden'
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    minHeight: 24,
    alignItems: 'center',
    backgroundColor: '#f9fafb', // Light gray header bg
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCol: {
    padding: '6 8',
  },
  tableCellHeader: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#4b5563', // Gray-600
    textTransform: 'uppercase',
  },
  tableCell: {
    fontSize: 9,
    color: '#374151',
  },
  
  // Chart & Footer
  chartContainer: {
    marginVertical: 15,
    height: 180,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  disclaimer: {
    fontSize: 9,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'justify',
    marginTop: 20
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 10,
  },
});

// --- CHART COMPONENT ---
const PDFChart = ({ data, title, color = '#0284C7', width = 500, height = 180, unit = '' }: any) => {
  if (!data || data.length < 2) {
    return (
      <View style={styles.chartContainer}>
         <Text style={{fontSize: 9, color: '#9ca3af', fontStyle: 'italic'}}>Datos insuficientes para graficar {title}</Text>
      </View>
    );
  }
  
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
    <View style={{ marginBottom: 20, marginTop: 10 }}>
      <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 5, color: '#374151' }}>{title}</Text>
      <Svg width={width} height={height}>
        <Line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" strokeWidth={1} />
        <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth={1} />
        <Line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f3f4f6" strokeWidth={1} strokeDasharray="4 4" />
        <Line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#f3f4f6" strokeWidth={1} strokeDasharray="4 4" />

        <Polyline points={points} stroke={color} strokeWidth={2} fill="none" />
        
        {data.map((d: any, i: number) => {
           const x = padding + (i / (data.length - 1)) * graphWidth;
           const y = height - padding - ((d.value - yMin) / range) * graphHeight;
           const showLabel = i === 0 || i === data.length - 1 || data.length < 8;

           return (
             <G key={i}>
                <Circle cx={x} cy={y} r={3} fill="#ffffff" stroke={color} strokeWidth={2} />
                {showLabel && (
                    <Text x={x - 10} y={y - 8} style={{ fontSize: 8 }} fill="#4b5563">
                        {d.value.toFixed(1)}{unit}
                    </Text>
                )}
             </G>
           )
        })}
        
        <Text x={padding} y={height - 5} style={{ fontSize: 8 }} fill="#9ca3af">
           {new Date(data[0].date).toLocaleDateString('es-MX', {month:'short', day:'numeric'})}
        </Text>
        <Text x={width - padding - 40} y={height - 5} style={{ fontSize: 8 }} fill="#9ca3af" textAnchor="end">
           {new Date(data[data.length - 1].date).toLocaleDateString('es-MX', {month:'short', day:'numeric'})}
        </Text>
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
      return `${age} AÑOS / ${person.gender === 'male' ? 'MASC' : 'FEM'}`;
  };

  const sortedConsultations = [...consultations].sort((a, b) => new Date(a.consultation_date).getTime() - new Date(b.consultation_date).getTime());
  const weightData = sortedConsultations.filter(c => c.weight_kg != null).map(c => ({ date: c.consultation_date, value: c.weight_kg! }));
  const imcData = sortedConsultations.filter(c => c.imc != null).map(c => ({ date: c.consultation_date, value: c.imc! }));

  // Get historical data for the table (most recent first)
  const historyData = [...consultations].sort((a, b) => new Date(b.consultation_date).getTime() - new Date(a.consultation_date).getTime()).slice(0, 6);

  const latestDiet = dietLogs[0];
  const latestExercise = exerciseLogs[0];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header} fixed>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
             {clinic?.logo_url && (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image src={clinic.logo_url} style={styles.logo} />
             )}
             <View>
                 <Text style={styles.clinicName}>{clinic?.name || 'Zegna Nutrición'}</Text>
                 <Text style={styles.clinicMeta}>Reporte de Progreso</Text>
             </View>
          </View>
          <View style={styles.clinicInfo}>
            <Text style={styles.clinicMeta}>{clinic?.address || ''}</Text>
            <Text style={styles.clinicMeta}>{clinic?.phone_number || ''} | {clinic?.email || ''}</Text>
            <Text style={styles.clinicMeta}>Generado: {new Date().toLocaleDateString('es-MX')}</Text>
          </View>
        </View>

        {/* PATIENT INFO HEADER */}
        <View style={styles.patientInfoBox} wrap={false}>
          <View style={styles.row}>
            <View style={styles.col2}>
              <Text style={styles.label}>PACIENTE</Text>
              <Text style={{fontSize: 11, fontWeight: 'bold', color: '#111827'}}>{person.full_name.toUpperCase()}</Text>
            </View>
            <View style={styles.col2}>
               <Text style={styles.label}>EDAD / GÉNERO</Text>
               <Text style={{fontSize: 10, fontWeight: 'bold', color: '#1f2937'}}>{calculateAge(person.birth_date)}</Text>
            </View>
             <View style={{width: '25%'}}>
               <Text style={styles.label}>FECHA REPORTE</Text>
               <Text style={{fontSize: 10, fontWeight: 'bold', color: '#1f2937'}}>{new Date().toLocaleDateString('es-MX')}</Text>
            </View>
          </View>
        </View>

        {/* SECTION 1: RESUMEN CLÍNICO */}
        {options.page1_results && (
          <View>
            <Text style={styles.sectionTitle}>RESUMEN CLÍNICO</Text>
            
            {/* Top Metrics Grid */}
            <View style={styles.metricsContainer}>
               {/* Peso */}
               <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>PESO ACTUAL</Text>
                    <Text style={{...styles.metricValueLarge, color: '#0284C7'}}>{reportData.pesoActual ? `${reportData.pesoActual} kg` : '-'}</Text>
                    <Text style={{...styles.metricSubtext, color: '#10B981'}}>
                        {reportData.perdidaPeso ? `Cambio: ${reportData.perdidaPeso}` : 'Medición Inicial'}
                    </Text>
               </View>
               {/* IMC */}
               <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>IMC ACTUAL</Text>
                    <Text style={{...styles.metricValueLarge, color: '#1f2937'}}>{reportData.imcActual || '-'}</Text>
                    <Text style={{fontSize: 9, color: '#6b7280'}}>kg/m²</Text>
               </View>
               {/* Objetivo */}
               <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>OBJETIVO DE SALUD</Text>
                    <Text style={{fontSize: 10, color: '#1f2937', textTransform: 'uppercase'}}>{person.health_goal || 'NO ESPECIFICADO'}</Text>
               </View>
            </View>

            {/* Lab Results Table */}
            <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                    <View style={{...styles.tableCol, width: '30%'}}><Text style={styles.tableCellHeader}>PARÁMETRO</Text></View>
                    <View style={{...styles.tableCol, width: '25%'}}><Text style={{...styles.tableCellHeader, textAlign: 'center'}}>VALOR</Text></View>
                    <View style={{...styles.tableCol, width: '25%'}}><Text style={{...styles.tableCellHeader, textAlign: 'center'}}>REFERENCIA</Text></View>
                    <View style={{...styles.tableCol, width: '20%'}}><Text style={{...styles.tableCellHeader, textAlign: 'right'}}>ESTADO</Text></View>
                </View>
                
                {/* Row 1: Glucose */}
                <View style={styles.tableRow}>
                    <View style={{...styles.tableCol, width: '30%'}}><Text style={styles.tableCell}>Glucosa Capilar</Text></View>
                    <View style={{...styles.tableCol, width: '25%'}}><Text style={{...styles.tableCell, textAlign: 'center'}}>{reportData.glucosaCapilar ? `${reportData.glucosaCapilar} mg/dL` : '-'}</Text></View>
                    <View style={{...styles.tableCol, width: '25%'}}><Text style={{...styles.tableCell, textAlign: 'center'}}>{'< 100'}</Text></View>
                    <View style={{...styles.tableCol, width: '20%'}}>
                         <Text style={{
                             fontSize: 9, 
                             textAlign: 'right', 
                             fontWeight: 'bold', 
                             color: !reportData.glucosaCapilar ? '#9ca3af' : reportData.glucosaCapilar > 100 ? '#EF4444' : '#10B981'
                        }}>
                            {!reportData.glucosaCapilar ? '-' : reportData.glucosaCapilar > 100 ? 'ALTO' : 'NORMAL'}
                        </Text>
                    </View>
                </View>

                {/* Row 2: Cholesterol */}
                 <View style={styles.tableRow}>
                    <View style={{...styles.tableCol, width: '30%'}}><Text style={styles.tableCell}>Colesterol Total</Text></View>
                    <View style={{...styles.tableCol, width: '25%'}}><Text style={{...styles.tableCell, textAlign: 'center'}}>{reportData.colesterolActual ? `${reportData.colesterolActual} mg/dL` : '-'}</Text></View>
                    <View style={{...styles.tableCol, width: '25%'}}><Text style={{...styles.tableCell, textAlign: 'center'}}>{'< 200'}</Text></View>
                    <View style={{...styles.tableCol, width: '20%'}}>
                         <Text style={{
                             fontSize: 9, 
                             textAlign: 'right', 
                             fontWeight: 'bold', 
                             color: !reportData.colesterolActual ? '#9ca3af' : reportData.colesterolActual > 200 ? '#EF4444' : '#10B981'
                        }}>
                            {!reportData.colesterolActual ? '-' : reportData.colesterolActual > 200 ? 'ALTO' : 'NORMAL'}
                        </Text>
                    </View>
                </View>
                 {/* Row 3: Triglycerides (if available) */}
                 {reportData.triglyceridosActual && (
                     <View style={styles.tableRow}>
                        <View style={{...styles.tableCol, width: '30%'}}><Text style={styles.tableCell}>Triglicéridos</Text></View>
                        <View style={{...styles.tableCol, width: '25%'}}><Text style={{...styles.tableCell, textAlign: 'center'}}>{reportData.triglyceridosActual} mg/dL</Text></View>
                        <View style={{...styles.tableCol, width: '25%'}}><Text style={{...styles.tableCell, textAlign: 'center'}}>{'< 150'}</Text></View>
                         <View style={{...styles.tableCol, width: '20%'}}>
                             <Text style={{
                                 fontSize: 9, 
                                 textAlign: 'right', 
                                 fontWeight: 'bold', 
                                 color: reportData.triglyceridosActual > 150 ? '#EF4444' : '#10B981'
                            }}>
                                {reportData.triglyceridosActual > 150 ? 'ALTO' : 'NORMAL'}
                            </Text>
                        </View>
                    </View>
                 )}
            </View>

            {/* Progress History Table */}
            <Text style={styles.sectionTitle}>HISTORIAL DE PROGRESO</Text>
            <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                    <View style={{...styles.tableCol, width: '25%'}}><Text style={styles.tableCellHeader}>FECHA</Text></View>
                    <View style={{...styles.tableCol, width: '25%'}}><Text style={{...styles.tableCellHeader, textAlign: 'center'}}>PESO (KG)</Text></View>
                    <View style={{...styles.tableCol, width: '25%'}}><Text style={{...styles.tableCellHeader, textAlign: 'center'}}>IMC</Text></View>
                    <View style={{...styles.tableCol, width: '25%'}}><Text style={{...styles.tableCellHeader, textAlign: 'center'}}>TALLA (CM)</Text></View>
                </View>
                
                {historyData.map((consult, index) => (
                    <View key={index} style={styles.tableRow}>
                        <View style={{...styles.tableCol, width: '25%'}}>
                            <Text style={styles.tableCell}>{new Date(consult.consultation_date).toLocaleDateString('es-MX')}</Text>
                        </View>
                        <View style={{...styles.tableCol, width: '25%'}}>
                            <Text style={{...styles.tableCell, textAlign: 'center'}}>{consult.weight_kg || '-'}</Text>
                        </View>
                        <View style={{...styles.tableCol, width: '25%'}}>
                            <Text style={{...styles.tableCell, textAlign: 'center'}}>{consult.imc || '-'}</Text>
                        </View>
                        <View style={{...styles.tableCol, width: '25%'}}>
                             <Text style={{...styles.tableCell, textAlign: 'center'}}>{consult.height_cm || '-'}</Text>
                        </View>
                    </View>
                ))}
                
                {historyData.length === 0 && (
                     <View style={{padding: 10}}>
                         <Text style={{fontSize: 9, color: '#9ca3af', textAlign: 'center', fontStyle: 'italic'}}>No hay historial registrado.</Text>
                     </View>
                )}
            </View>

          </View>
        )}

        {/* SECTION 2: GRÁFICOS (New Page) */}
        {options.page2_charts && (
           <View break>
              <Text style={styles.sectionTitle}>ANÁLISIS GRÁFICO</Text>
              
              <View style={{flexDirection: 'row', gap: 10, flexWrap: 'wrap'}}>
                  <View style={{width: '100%'}}>
                       <PDFChart data={weightData} title="Evolución de Peso (kg)" color="#0284C7" unit="kg" />
                  </View>
                  <View style={{width: '100%'}}>
                       <PDFChart data={imcData} title="Historial de IMC" color="#8B5CF6" />
                  </View>
              </View>
           </View>
        )}
        
        {/* SECTION 3: PLAN ACTUAL (New Page) */}
        {options.page3_tables && (
            <View break>
                <Text style={styles.sectionTitle}>PLAN ACTUAL</Text>
                
                {/* Dieta */}
                {latestDiet ? (
                    <View style={{marginBottom: 20}}>
                        <Text style={styles.subTitle}>Plan de Alimentación ({new Date(latestDiet.log_date).toLocaleDateString()})</Text>
                        <View style={styles.table}>
                            <View style={styles.tableHeaderRow}>
                                <View style={{...styles.tableCol, width: '25%'}}><Text style={styles.tableCellHeader}>TIEMPO</Text></View>
                                <View style={{...styles.tableCol, width: '75%'}}><Text style={styles.tableCellHeader}>MENÚ</Text></View>
                            </View>
                            {latestDiet.desayuno && (
                                <View style={styles.tableRow}>
                                    <View style={{...styles.tableCol, width: '25%'}}><Text style={{...styles.tableCell, fontWeight: 'bold'}}>Desayuno</Text></View>
                                    <View style={{...styles.tableCol, width: '75%'}}><Text style={{...styles.tableCell, textAlign: 'left'}}>{latestDiet.desayuno}</Text></View>
                                </View>
                            )}
                            {latestDiet.colacion_1 && (
                                <View style={styles.tableRow}>
                                    <View style={{...styles.tableCol, width: '25%'}}><Text style={{...styles.tableCell, fontWeight: 'bold'}}>Colación 1</Text></View>
                                    <View style={{...styles.tableCol, width: '75%'}}><Text style={{...styles.tableCell, textAlign: 'left'}}>{latestDiet.colacion_1}</Text></View>
                                </View>
                            )}
                            {latestDiet.comida && (
                                <View style={styles.tableRow}>
                                    <View style={{...styles.tableCol, width: '25%'}}><Text style={{...styles.tableCell, fontWeight: 'bold'}}>Comida</Text></View>
                                    <View style={{...styles.tableCol, width: '75%'}}><Text style={{...styles.tableCell, textAlign: 'left'}}>{latestDiet.comida}</Text></View>
                                </View>
                            )}
                            {latestDiet.colacion_2 && (
                                <View style={styles.tableRow}>
                                    <View style={{...styles.tableCol, width: '25%'}}><Text style={{...styles.tableCell, fontWeight: 'bold'}}>Colación 2</Text></View>
                                    <View style={{...styles.tableCol, width: '75%'}}><Text style={{...styles.tableCell, textAlign: 'left'}}>{latestDiet.colacion_2}</Text></View>
                                </View>
                            )}
                            {latestDiet.cena && (
                                <View style={styles.tableRow}>
                                    <View style={{...styles.tableCol, width: '25%'}}><Text style={{...styles.tableCell, fontWeight: 'bold'}}>Cena</Text></View>
                                    <View style={{...styles.tableCol, width: '75%'}}><Text style={{...styles.tableCell, textAlign: 'left'}}>{latestDiet.cena}</Text></View>
                                </View>
                            )}
                        </View>
                    </View>
                ) : (
                    <Text style={{fontSize: 9, color: '#6b7280', fontStyle: 'italic', marginBottom: 10}}>Sin plan de alimentación registrado recientemente.</Text>
                )}

                {/* Ejercicio */}
                {latestExercise ? (
                    <View style={{marginTop: 10}}>
                         <Text style={styles.subTitle}>Rutina de Ejercicio ({latestExercise.enfoque || 'General'})</Text>
                         <View style={{...styles.patientInfoBox, backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderWidth: 1}}>
                            {Array.isArray(latestExercise.ejercicios) && latestExercise.ejercicios.length > 0 ? (
                                (latestExercise.ejercicios as any[]).map((ex, idx) => (
                                    <Text key={idx} style={{fontSize: 9, marginBottom: 4}}>
                                        • <Text style={{fontWeight: 'bold'}}>{ex.nombre}</Text>: {ex.series} series, {ex.repeticiones} reps.
                                    </Text>
                                ))
                            ) : (
                                <Text style={{fontSize: 9}}>Descanso o actividad libre.</Text>
                            )}
                         </View>
                    </View>
                ) : null}
            </View>
        )}

        {/* SECTION 4: CIERRE (New Page) */}
        {options.page4_welcome && (
          <View break style={{marginTop: 30}}>
            <Text style={styles.sectionTitle}>COMENTARIOS FINALES</Text>
            <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 20 }}>
                <Text style={styles.disclaimer}>
                Este reporte es un resumen de tu estado actual y progreso. Recuerda que la constancia es la clave para obtener resultados sostenibles. Si tienes dudas sobre tu plan o mediciones, por favor contáctanos.
                </Text>
            </View>

            <View style={{ marginTop: 80, alignItems: 'center' }}>
              <View style={{ borderBottomWidth: 1, borderBottomColor: '#000', width: 200, marginBottom: 8 }} />
              <Text style={{ fontWeight: 'bold', fontSize: 10, color: '#111827' }}>{nutritionistProfile?.full_name || 'Nutriólogo'}</Text>
              <Text style={{ fontSize: 9, color: '#4b5563' }}>{nutritionistProfile?.professional_title || 'Especialista en Nutrición'}</Text>
              {nutritionistProfile?.license_number && (
                 <Text style={{ fontSize: 9, color: '#4b5563' }}>Céd. Prof. {nutritionistProfile.license_number}</Text>
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