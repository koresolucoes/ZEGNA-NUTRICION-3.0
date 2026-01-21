
import React, { FC, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Page, Text, View, Document, StyleSheet, PDFViewer, Image, Font } from '@react-pdf/renderer';
import { Person, ConsultationWithLabs, DietLog, ExerciseLog, Allergy, MedicalHistory, Medication, LifestyleHabits, NutritionistProfile, Clinic } from '../types';
import { styles as appStyles } from '../constants'; // Renamed to avoid conflict
import { ICONS } from '../pages/AuthPage';

// Register a standard font for a professional look
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ],
});

interface ReportModalProps {
    person: Person;
    consultations: ConsultationWithLabs[];
    dietLogs: DietLog[];
    exerciseLogs: ExerciseLog[];
    allergies: Allergy[];
    medicalHistory: MedicalHistory[];
    medications: Medication[];
    lifestyleHabits: LifestyleHabits | null;
    isMobile: boolean;
    onClose: () => void;
    nutritionistProfile: NutritionistProfile | null;
    clinic: Clinic | null;
    zIndex?: number;
}

const modalRoot = document.getElementById('modal-root');

// --- PDF STYLES ---
const pdfStyles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 40, // Standard margin (~1.4cm)
        fontFamily: 'Roboto',
        fontSize: 10,
        color: '#333333',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#0284C7', // Primary Color
        paddingBottom: 10,
    },
    logoContainer: {
        width: 120,
        height: 50,
        justifyContent: 'center',
    },
    logo: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },
    clinicInfo: {
        textAlign: 'right',
        flex: 1,
    },
    clinicName: {
        fontSize: 16,
        fontWeight: 700,
        color: '#0284C7',
        marginBottom: 4,
    },
    clinicDetail: {
        fontSize: 8,
        color: '#666666',
        marginBottom: 1,
    },
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 700,
        color: '#0284C7',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E7FF',
        marginBottom: 8,
        paddingBottom: 2,
        textTransform: 'uppercase',
    },
    // Patient Grid
    patientInfoContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#F8FAFC',
        padding: 10,
        borderRadius: 4,
        marginBottom: 20,
        border: '1pt solid #E2E8F0',
    },
    patientInfoItem: {
        width: '33%',
        marginBottom: 5,
    },
    label: {
        fontSize: 7,
        color: '#64748B',
        textTransform: 'uppercase',
        marginBottom: 2,
        fontWeight: 700,
    },
    value: {
        fontSize: 10,
        fontWeight: 500,
        color: '#0F172A',
    },
    // Metrics Grid
    metricsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    metricBox: {
        width: '23%',
        padding: 10,
        border: '1pt solid #E2E8F0',
        borderRadius: 4,
        alignItems: 'center',
    },
    metricBoxHighlight: {
        width: '23%',
        padding: 10,
        border: '1pt solid #BAE6FD',
        backgroundColor: '#F0F9FF',
        borderRadius: 4,
        alignItems: 'center',
    },
    metricLabel: {
        fontSize: 8,
        color: '#64748B',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    metricValue: {
        fontSize: 14,
        fontWeight: 700,
        color: '#0F172A',
    },
    metricUnit: {
        fontSize: 8,
        fontWeight: 400,
        color: '#64748B',
    },
    // Table
    table: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 10,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        minHeight: 20,
        alignItems: 'center',
    },
    tableHeader: {
        backgroundColor: '#F1F5F9',
    },
    tableCell: {
        flex: 1,
        fontSize: 9,
        padding: 5,
        textAlign: 'center',
    },
    tableCellHeader: {
        fontWeight: 700,
        color: '#475569',
    },
    // Footer
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingTop: 10,
    },
    signature: {
        marginTop: 30,
        marginBottom: 10,
        alignSelf: 'center',
        width: 200,
        borderTopWidth: 1,
        borderTopColor: '#000',
        textAlign: 'center',
        paddingTop: 5,
    },
    signatureText: {
        fontSize: 9,
        fontWeight: 700,
    },
    footerText: {
        fontSize: 8,
        color: '#94A3B8',
        marginBottom: 2,
    },
});

// --- PDF COMPONENT ---
const ClinicReportPDF = ({
    person,
    clinic,
    nutritionistProfile,
    reportData,
    filteredConsultations
}: {
    person: Person;
    clinic: Clinic | null;
    nutritionistProfile: NutritionistProfile | null;
    reportData: any;
    filteredConsultations: ConsultationWithLabs[];
}) => {
    const calculateAge = (birthDate: string | null | undefined): string => {
        if (!birthDate) return 'N/A';
        const birth = new Date(birthDate.replace(/-/g, '/'));
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return `${age}`;
    };

    return (
        <Document>
            <Page size="LETTER" style={pdfStyles.page}>
                {/* HEADER */}
                <View style={pdfStyles.header}>
                    <View style={pdfStyles.logoContainer}>
                        {clinic?.logo_url && (
                             /* eslint-disable-next-line jsx-a11y/alt-text */
                            <Image src={clinic.logo_url} style={pdfStyles.logo} />
                        )}
                    </View>
                    <View style={pdfStyles.clinicInfo}>
                        <Text style={pdfStyles.clinicName}>{clinic?.name || 'Clínica de Nutrición'}</Text>
                        <Text style={pdfStyles.clinicDetail}>{nutritionistProfile?.full_name}</Text>
                        {nutritionistProfile?.license_number && <Text style={pdfStyles.clinicDetail}>Céd. Prof. {nutritionistProfile.license_number}</Text>}
                        <Text style={pdfStyles.clinicDetail}>{clinic?.address}</Text>
                        <Text style={pdfStyles.clinicDetail}>{clinic?.phone_number}</Text>
                    </View>
                </View>

                {/* PATIENT INFO */}
                <View style={pdfStyles.patientInfoContainer}>
                    <View style={pdfStyles.patientInfoItem}>
                        <Text style={pdfStyles.label}>PACIENTE</Text>
                        <Text style={pdfStyles.value}>{person.full_name}</Text>
                    </View>
                    <View style={pdfStyles.patientInfoItem}>
                        <Text style={pdfStyles.label}>EDAD / GÉNERO</Text>
                        <Text style={pdfStyles.value}>{calculateAge(person.birth_date)} Años / {person.gender === 'male' ? 'H' : 'M'}</Text>
                    </View>
                    <View style={pdfStyles.patientInfoItem}>
                        <Text style={pdfStyles.label}>FECHA REPORTE</Text>
                        <Text style={pdfStyles.value}>{new Date().toLocaleDateString('es-MX')}</Text>
                    </View>
                    <View style={pdfStyles.patientInfoItem}>
                        <Text style={pdfStyles.label}>EXPEDIENTE</Text>
                        <Text style={pdfStyles.value}>{person.folio || 'N/A'}</Text>
                    </View>
                    <View style={{...pdfStyles.patientInfoItem, width: '66%'}}>
                        <Text style={pdfStyles.label}>OBJETIVO</Text>
                        <Text style={pdfStyles.value}>{person.health_goal || 'General'}</Text>
                    </View>
                </View>

                {/* SUMMARY METRICS */}
                <View style={pdfStyles.section}>
                    <Text style={pdfStyles.sectionTitle}>RESUMEN DE PROGRESO</Text>
                    <View style={pdfStyles.metricsGrid}>
                        <View style={pdfStyles.metricBox}>
                            <Text style={pdfStyles.metricLabel}>PESO ACTUAL</Text>
                            <Text style={pdfStyles.metricValue}>{reportData.pesoActual ?? '-'} <Text style={pdfStyles.metricUnit}>kg</Text></Text>
                        </View>
                        <View style={pdfStyles.metricBox}>
                            <Text style={pdfStyles.metricLabel}>IMC</Text>
                            <Text style={pdfStyles.metricValue}>{reportData.imcActual ?? '-'}</Text>
                        </View>
                        <View style={pdfStyles.metricBoxHighlight}>
                            <Text style={pdfStyles.metricLabel}>CAMBIO TOTAL</Text>
                            <Text style={{...pdfStyles.metricValue, color: '#0369A1'}}>{reportData.perdidaPeso ?? '-'}</Text>
                        </View>
                        <View style={pdfStyles.metricBox}>
                            <Text style={pdfStyles.metricLabel}>GLUCOSA</Text>
                            <Text style={pdfStyles.metricValue}>{reportData.glucosaCapilar ?? '-'} <Text style={pdfStyles.metricUnit}>mg/dl</Text></Text>
                        </View>
                    </View>

                    {/* TWO COLUMN DATA */}
                    <View style={{flexDirection: 'row', gap: 20}}>
                         <View style={{flex: 1}}>
                             <View style={{flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 4, marginBottom: 4}}>
                                 <Text style={{fontSize: 9, color: '#666'}}>Peso Inicial</Text>
                                 <Text style={{fontSize: 9, fontWeight: 700}}>{reportData.pesoInicial} kg</Text>
                             </View>
                             <View style={{flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 4, marginBottom: 4}}>
                                 <Text style={{fontSize: 9, color: '#666'}}>Talla</Text>
                                 <Text style={{fontSize: 9, fontWeight: 700}}>{reportData.talla} cm</Text>
                             </View>
                         </View>
                         <View style={{flex: 1}}>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 4, marginBottom: 4}}>
                                 <Text style={{fontSize: 9, color: '#666'}}>Grasa Visceral</Text>
                                 <Text style={{fontSize: 9, fontWeight: 700}}>-</Text>
                             </View>
                             <View style={{flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 4, marginBottom: 4}}>
                                 <Text style={{fontSize: 9, color: '#666'}}>Cintura</Text>
                                 <Text style={{fontSize: 9, fontWeight: 700}}>-</Text>
                             </View>
                         </View>
                    </View>
                </View>

                {/* TABLE */}
                <View style={pdfStyles.section}>
                    <Text style={pdfStyles.sectionTitle}>HISTORIAL DE CONSULTAS</Text>
                    <View style={pdfStyles.table}>
                        {/* Header */}
                        <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
                            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellHeader]}>FECHA</Text>
                            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellHeader]}>PESO (kg)</Text>
                            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellHeader]}>IMC</Text>
                            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellHeader]}>TA</Text>
                            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellHeader]}>GLUCOSA</Text>
                        </View>
                        {/* Rows */}
                        {filteredConsultations.slice(0, 15).map((row, index) => (
                            <View key={row.id} style={[pdfStyles.tableRow, { backgroundColor: index % 2 === 0 ? '#fff' : '#F8FAFC' }]}>
                                <Text style={pdfStyles.tableCell}>{new Date(row.consultation_date).toLocaleDateString('es-MX', {timeZone: 'UTC'})}</Text>
                                <Text style={pdfStyles.tableCell}>{row.weight_kg}</Text>
                                <Text style={pdfStyles.tableCell}>{row.imc}</Text>
                                <Text style={pdfStyles.tableCell}>{row.ta || '-'}</Text>
                                <Text style={pdfStyles.tableCell}>{row.lab_results?.[0]?.glucose_mg_dl || '-'}</Text>
                            </View>
                        ))}
                    </View>
                </View>
                
                {/* DISCLAIMER BOX */}
                <View style={{marginTop: 10, padding: 10, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FCD34D', borderRadius: 4}}>
                    <Text style={{fontSize: 9, color: '#92400E', marginBottom: 4, fontWeight: 700}}>Notas Importantes</Text>
                    <Text style={{fontSize: 8, color: '#B45309'}}>
                        Este reporte refleja el progreso obtenido durante el tratamiento. Los resultados pueden variar según la adherencia al plan. Recuerda seguir las recomendaciones de hidratación y actividad física.
                    </Text>
                </View>

                {/* FOOTER */}
                <View style={pdfStyles.footer} fixed>
                     <View style={pdfStyles.signature}>
                        <Text style={pdfStyles.signatureText}>{nutritionistProfile?.full_name}</Text>
                        <Text style={{fontSize: 8, color: '#666'}}>{nutritionistProfile?.professional_title}</Text>
                    </View>
                    <Text style={pdfStyles.footerText}>Este documento es un reporte de seguimiento nutricional.</Text>
                    <Text style={pdfStyles.footerText}>{clinic?.name} | {clinic?.website || clinic?.email} | Pág. <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}/></Text>
                </View>
            </Page>
        </Document>
    );
};

// --- MAIN WRAPPER COMPONENT ---
const ReportModal: FC<ReportModalProps> = ({ person, consultations, onClose, nutritionistProfile, clinic, zIndex = 1200 }) => {
    
    // Memoize calculations to prevent recalculation on render
    const reportData = useMemo(() => {
        const sortedConsults = [...consultations].sort((a, b) => new Date(b.consultation_date).getTime() - new Date(a.consultation_date).getTime());
        const current = sortedConsults[0];
        const previous = sortedConsults[1];
        const initial = consultations[consultations.length - 1];

        const pesoActual = current?.weight_kg;
        const pesoInicial = initial?.weight_kg;
        const perdidaPeso = (pesoInicial && pesoActual) ? (((pesoInicial - pesoActual) / pesoInicial) * 100) : null;

        return {
            pesoActual,
            pesoInicial,
            imcActual: current?.imc,
            perdidaPeso: perdidaPeso ? (perdidaPeso > 0 ? `-${perdidaPeso.toFixed(1)}%` : `+${Math.abs(perdidaPeso).toFixed(1)}%`) : null,
            glucosaCapilar: current?.lab_results?.[0]?.glucose_mg_dl,
            talla: current?.height_cm || initial?.height_cm,
        };
    }, [consultations]);

    return createPortal(
        <div style={{...appStyles.modalOverlay, zIndex: zIndex, padding: 0}}>
            <div style={{...appStyles.modalContent, width: '95%', maxWidth: '1000px', height: '90vh', display: 'flex', flexDirection: 'column'}} className="fade-in">
                
                {/* Header */}
                <div style={{...appStyles.modalHeader, padding: '1rem', borderBottom: '1px solid #e2e8f0'}}>
                    <h2 style={appStyles.modalTitle}>Reporte Clínico (PDF)</h2>
                    <button onClick={onClose} style={{...appStyles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                
                {/* PDF VIEWER BODY - THIS IS THE CORE CHANGE */}
                <div style={{ flex: 1, backgroundColor: '#525659', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                    <PDFViewer width="100%" height="100%" style={{ border: 'none' }} showToolbar={true}>
                        <ClinicReportPDF 
                            person={person}
                            clinic={clinic}
                            nutritionistProfile={nutritionistProfile}
                            reportData={reportData}
                            filteredConsultations={consultations}
                        />
                    </PDFViewer>
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default ReportModal;
