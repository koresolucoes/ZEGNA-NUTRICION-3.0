import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { Person, Clinic, NutritionistProfile, Medication } from '../../../types';

// Register fonts if needed
Font.register({
    family: 'Inter',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2', fontWeight: 400 },
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiA.woff2', fontWeight: 600 },
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2', fontWeight: 700 }
    ]
});

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Inter',
        backgroundColor: '#ffffff',
        color: '#1f2937',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 2,
        borderBottomColor: '#e5e7eb',
        paddingBottom: 20,
        marginBottom: 20,
    },
    logo: {
        width: 100,
        height: 'auto',
    },
    clinicInfo: {
        alignItems: 'flex-end',
    },
    clinicName: {
        fontSize: 16,
        fontWeight: 700,
        color: '#111827',
    },
    doctorName: {
        fontSize: 12,
        color: '#4b5563',
        marginTop: 4,
    },
    contactInfo: {
        fontSize: 10,
        color: '#6b7280',
        marginTop: 2,
    },
    title: {
        fontSize: 20,
        fontWeight: 700,
        color: '#111827',
        marginBottom: 20,
        textAlign: 'center',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 600,
        color: '#374151',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingBottom: 5,
        marginBottom: 10,
    },
    patientRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    label: {
        fontSize: 10,
        color: '#6b7280',
        width: '30%',
    },
    value: {
        fontSize: 10,
        color: '#111827',
        width: '70%',
        fontWeight: 500,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    metricBox: {
        width: '30%',
        backgroundColor: '#f3f4f6',
        padding: 10,
        borderRadius: 4,
    },
    metricLabel: {
        fontSize: 9,
        color: '#6b7280',
        marginBottom: 4,
    },
    metricValue: {
        fontSize: 14,
        fontWeight: 600,
        color: '#111827',
    },
    prescriptionItem: {
        marginBottom: 10,
        padding: 10,
        backgroundColor: '#f9fafb',
        borderRadius: 4,
        borderLeftWidth: 3,
        borderLeftColor: '#3b82f6',
    },
    medName: {
        fontSize: 12,
        fontWeight: 600,
        color: '#111827',
        marginBottom: 4,
    },
    medDetails: {
        fontSize: 10,
        color: '#4b5563',
    },
    notesBox: {
        backgroundColor: '#fef3c7',
        padding: 15,
        borderRadius: 4,
        marginTop: 10,
    },
    notesText: {
        fontSize: 10,
        color: '#92400e',
        lineHeight: 1.5,
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 40,
        right: 40,
        textAlign: 'center',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 10,
    },
    footerText: {
        fontSize: 9,
        color: '#9ca3af',
    },
    signatureLine: {
        width: 200,
        borderBottomWidth: 1,
        borderBottomColor: '#111827',
        marginHorizontal: 'auto',
        marginTop: 40,
        marginBottom: 5,
    },
    signatureText: {
        fontSize: 10,
        color: '#4b5563',
        textAlign: 'center',
    }
});

interface PatientSummaryDocumentProps {
    person: Person;
    clinic: Clinic | null;
    nutritionistProfile: NutritionistProfile | null;
    metrics: { weight?: number; height?: number; imc?: string; };
    prescriptions: Medication[];
    recommendations: string;
    nextAppointment?: string;
}

const PatientSummaryDocument: React.FC<PatientSummaryDocumentProps> = ({
    person, clinic, nutritionistProfile, metrics, prescriptions, recommendations, nextAppointment
}) => {
    const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        {clinic?.logo_url ? (
                            <Image src={clinic.logo_url} style={styles.logo} />
                        ) : (
                            <Text style={styles.clinicName}>{clinic?.name || 'Clínica'}</Text>
                        )}
                    </View>
                    <View style={styles.clinicInfo}>
                        <Text style={styles.doctorName}>Dr(a). {nutritionistProfile?.full_name || 'Especialista'}</Text>
                        {nutritionistProfile?.professional_license && (
                            <Text style={styles.contactInfo}>Cédula: {nutritionistProfile.professional_license}</Text>
                        )}
                        {clinic?.phone_number && <Text style={styles.contactInfo}>Tel: {clinic.phone_number}</Text>}
                        {clinic?.email && <Text style={styles.contactInfo}>{clinic.email}</Text>}
                    </View>
                </View>

                <Text style={styles.title}>Resumen de Consulta</Text>

                {/* Patient Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Datos del Paciente</Text>
                    <View style={styles.patientRow}>
                        <Text style={styles.label}>Nombre:</Text>
                        <Text style={styles.value}>{person.first_name} {person.last_name}</Text>
                    </View>
                    <View style={styles.patientRow}>
                        <Text style={styles.label}>Fecha:</Text>
                        <Text style={styles.value}>{today}</Text>
                    </View>
                </View>

                {/* Metrics */}
                {(metrics.weight || metrics.height || metrics.imc) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Tus Mediciones Hoy</Text>
                        <View style={styles.metricsGrid}>
                            {metrics.weight && (
                                <View style={styles.metricBox}>
                                    <Text style={styles.metricLabel}>Peso</Text>
                                    <Text style={styles.metricValue}>{metrics.weight} kg</Text>
                                </View>
                            )}
                            {metrics.height && (
                                <View style={styles.metricBox}>
                                    <Text style={styles.metricLabel}>Estatura</Text>
                                    <Text style={styles.metricValue}>{metrics.height} cm</Text>
                                </View>
                            )}
                            {metrics.imc && (
                                <View style={styles.metricBox}>
                                    <Text style={styles.metricLabel}>IMC</Text>
                                    <Text style={styles.metricValue}>{metrics.imc}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Prescriptions */}
                {prescriptions && prescriptions.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Tu Receta / Suplementos</Text>
                        {prescriptions.map((med, index) => (
                            <View key={index} style={styles.prescriptionItem}>
                                <Text style={styles.medName}>{med.name}</Text>
                                <Text style={styles.medDetails}>
                                    Dosis: {med.dosage} | Frecuencia: {med.frequency}
                                </Text>
                                {med.notes && <Text style={{...styles.medDetails, marginTop: 4, fontStyle: 'italic'}}>Nota: {med.notes}</Text>}
                            </View>
                        ))}
                    </View>
                )}

                {/* Recommendations */}
                {recommendations && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Plan de Acción y Recomendaciones</Text>
                        <View style={styles.notesBox}>
                            <Text style={styles.notesText}>{recommendations}</Text>
                        </View>
                    </View>
                )}

                {/* Next Appointment */}
                {nextAppointment && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Próxima Cita Sugerida</Text>
                        <Text style={{fontSize: 11, color: '#111827', fontWeight: 600}}>{nextAppointment}</Text>
                    </View>
                )}

                {/* Signature */}
                <View style={{marginTop: 60}}>
                    <View style={styles.signatureLine} />
                    <Text style={styles.signatureText}>Firma del Especialista</Text>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Este documento es un resumen informativo de su consulta. Si tiene dudas, comuníquese con su especialista.
                    </Text>
                </View>
            </Page>
        </Document>
    );
};

export default PatientSummaryDocument;
