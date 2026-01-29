import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Svg, Line, Polyline, Circle, G } from '@react-pdf/renderer';
import { Person, NutritionistProfile, Clinic, ConsultationWithLabs, DietLog, ExerciseLog } from '../../types';

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60, // Space for footer
    paddingLeft: 40,
    paddingRight: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    position: 'relative' // Needed for absolute positioning context if not fixed
  },
  watermarkWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
    opacity: 0.08, // Very faint
  },
  watermarkImage: {
    width: 300,
    height: 300,
    objectFit: 'contain',
    transform: 'rotate(-45deg)'
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0284C7',
    marginTop: 10,
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#f3f4f6',
    paddingBottom: 6,
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
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  col2: {
    width: '50%',
    paddingRight: 10
  },
  col3: {
    width: '33.33%',
    paddingRight: 10
  },
  label: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: 'bold'
  },
  value: {
    fontSize: 10,
    fontWeight: 'medium',
    color: '#111827',
  },
  patientInfoBox: {
    marginBottom: 30,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  box: {
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    marginBottom: 15
  },
  table: {
    display: 'flex',
    width: 'auto',
    marginTop: 10,
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden'
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
    minHeight: 24,
    alignItems: 'center',
  },
  tableColHeader: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
    padding: 6,
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e5e7eb',
    padding: 6,
  },
  tableCellHeader: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
  },
  tableCell: {
    fontSize: 9,
    color: '#4b5563',
    textAlign: 'center',
  },
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
      return `${age} AÑOS`;
  };

  const sortedConsultations = [...consultations].sort((a, b) => new Date(a.consultation_date).getTime() - new Date(b.consultation_date).getTime());
  const weightData = sortedConsultations.filter(c => c.weight_kg != null).map(c => ({ date: c.consultation_date, value: c.weight_kg! }));
  const imcData = sortedConsultations.filter(c => c.imc != null).map(c => ({ date: c.consultation_date, value: c.imc! }));

  const latestDiet = dietLogs[0];
  const latestExercise = exerciseLogs[0];
  
  // Default Zegna logo if clinic logo not present
  const watermarkLogo = clinic?.logo_url || 'https://i.imgur.com/NOdUorv.png';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* WATERMARK (Fixed on every page) */}
        <View style={styles.watermarkWrapper} fixed>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={watermarkLogo} style={styles.watermarkImage} />
        </View>

        {/* HEADER (Repeats on every page) */}
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

        {/* PATIENT INFO (Only on first page naturally) */}
        <View style={styles.patientInfoBox} wrap={false}>
          <View style={styles.row}>
            <View style={styles.col2}>
              <Text style={styles.label}>PACIENTE</Text>
              <Text style={{...styles.value, fontSize: 12, fontWeight: 'bold'}}>{person.full_name.toUpperCase()}</Text>
              <Text style={{fontSize: 9, color: '#6b7280', marginTop: 2}}>{calculateAge(person.birth_date)} / {person.gender === 'male' ? 'Hombre' : 'Mujer'}</Text>
            </View>
            <View style={styles.col2}>
               <Text style={styles.label}>EXPEDIENTE / FOLIO</Text>
               <Text style={styles.value}>{person.folio || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.row}>
             <View style={{width: '100%'}}>
                 <Text style={styles.label}>OBJETIVO</Text>
                 <Text style={styles.value}>{person.health_goal || 'No especificado'}</Text>
             </View>
          </View>
        </View>

        {/* SECTION 1: RESUMEN CLÍNICO */}
        {options.page1_results && (
          <View>
            <Text style={styles.sectionTitle}>Resumen de Mediciones</Text>
            
            <View style={{...styles.box, flexDirection: 'row'}}>
               <View style={styles.col3}>
                    <Text style={styles.label}>PESO ACTUAL</Text>
                    <Text style={{fontSize: 16, fontWeight: 'bold', color: '#0284C7'}}>{reportData.pesoActual ? `${reportData.pesoActual} kg` : '-'}</Text>
                    <Text style={{fontSize: 8, color: reportData.perdidaPeso?.includes('-') ? '#10B981' : '#6b7280'}}>
                        {reportData.perdidaPeso ? `Cambio: ${reportData.perdidaPeso}` : 'Inicio'}
                    </Text>
               </View>
               <View style={styles.col3}>
                    <Text style={styles.label}>IMC</Text>
                    <Text style={{fontSize: 16, fontWeight: 'bold', color: '#374151'}}>{reportData.imcActual || '-'}</Text>
                    <Text style={{fontSize: 8, color: '#6b7280'}}>kg/m²</Text>
               </View>
               <View style={styles.col3}>
                    <Text style={styles.label}>TALLA</Text>
                    <Text style={{fontSize: 16, fontWeight: 'bold', color: '#374151'}}>{reportData.talla ? `${reportData.talla}` : '-'}</Text>
                    <Text style={{fontSize: 8, color: '#6b7280'}}>cm</Text>
               </View>
            </View>

            <View wrap={false}>
                <Text style={styles.subTitle}>Indicadores de Laboratorio Recientes</Text>
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
                    <View style={styles.tableCol}><Text style={{...styles.tableCell, color: reportData.glucosaCapilar > 100 ? '#EF4444' : '#10B981', fontWeight: 'bold'}}>{!reportData.glucosaCapilar ? '-' : reportData.glucosaCapilar > 100 ? 'ALTO' : 'NORMAL'}</Text></View>
                </View>
                <View style={styles.tableRow}>
                    <View style={styles.tableCol}><Text style={styles.tableCell}>Colesterol</Text></View>
                    <View style={styles.tableCol}><Text style={styles.tableCell}>{reportData.colesterolActual || '-'}</Text></View>
                    <View style={styles.tableCol}><Text style={styles.tableCell}>{'< 200 mg/dL'}</Text></View>
                    <View style={styles.tableCol}><Text style={{...styles.tableCell, color: reportData.colesterolActual > 200 ? '#EF4444' : '#10B981', fontWeight: 'bold'}}>{!reportData.colesterolActual ? '-' : reportData.colesterolActual > 200 ? 'ALTO' : 'NORMAL'}</Text></View>
                </View>
                </View>
            </View>
          </View>
        )}

        {/* SECTION 2: GRÁFICOS (New Page) */}
        {options.page2_charts && (
           <View break>
              <Text style={styles.sectionTitle}>Análisis de Progreso</Text>
              
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
        
        {/* SECTION 3: PLANES ACTUALES (New Page) */}
        {options.page3_tables && (
            <View break>
                <Text style={styles.sectionTitle}>Plan Actual</Text>
                
                {/* Dieta */}
                {latestDiet ? (
                    <View style={{marginBottom: 20}}>
                        <Text style={styles.subTitle}>Plan de Alimentación ({new Date(latestDiet.log_date).toLocaleDateString()})</Text>
                        <View style={styles.table}>
                            <View style={styles.tableRow}>
                                <View style={{...styles.tableColHeader, width: '30%'}}><Text style={styles.tableCellHeader}>Tiempo</Text></View>
                                <View style={{...styles.tableColHeader, width: '70%'}}><Text style={styles.tableCellHeader}>Menú</Text></View>
                            </View>
                            {latestDiet.desayuno && (
                                <View style={styles.tableRow}>
                                    <View style={{...styles.tableCol, width: '30%'}}><Text style={{...styles.tableCell, fontWeight: 'bold'}}>Desayuno</Text></View>
                                    <View style={{...styles.tableCol, width: '70%'}}><Text style={{...styles.tableCell, textAlign: 'left'}}>{latestDiet.desayuno}</Text></View>
                                </View>
                            )}
                            {latestDiet.colacion_1 && (
                                <View style={styles.tableRow}>
                                    <View style={{...styles.tableCol, width: '30%'}}><Text style={{...styles.tableCell, fontWeight: 'bold'}}>Colación 1</Text></View>
                                    <View style={{...styles.tableCol, width: '70%'}}><Text style={{...styles.tableCell, textAlign: 'left'}}>{latestDiet.colacion_1}</Text></View>
                                </View>
                            )}
                            {latestDiet.comida && (
                                <View style={styles.tableRow}>
                                    <View style={{...styles.tableCol, width: '30%'}}><Text style={{...styles.tableCell, fontWeight: 'bold'}}>Comida</Text></View>
                                    <View style={{...styles.tableCol, width: '70%'}}><Text style={{...styles.tableCell, textAlign: 'left'}}>{latestDiet.comida}</Text></View>
                                </View>
                            )}
                            {latestDiet.colacion_2 && (
                                <View style={styles.tableRow}>
                                    <View style={{...styles.tableCol, width: '30%'}}><Text style={{...styles.tableCell, fontWeight: 'bold'}}>Colación 2</Text></View>
                                    <View style={{...styles.tableCol, width: '70%'}}><Text style={{...styles.tableCell, textAlign: 'left'}}>{latestDiet.colacion_2}</Text></View>
                                </View>
                            )}
                            {latestDiet.cena && (
                                <View style={styles.tableRow}>
                                    <View style={{...styles.tableCol, width: '30%'}}><Text style={{...styles.tableCell, fontWeight: 'bold'}}>Cena</Text></View>
                                    <View style={{...styles.tableCol, width: '70%'}}><Text style={{...styles.tableCell, textAlign: 'left'}}>{latestDiet.cena}</Text></View>
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
                         <View style={styles.box}>
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
            <Text style={styles.sectionTitle}>Comentarios Finales</Text>
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