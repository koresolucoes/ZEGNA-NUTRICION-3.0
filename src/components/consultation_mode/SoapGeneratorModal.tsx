import React, { FC, useState } from 'react';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { Person, MedicalHistory, Medication, Allergy } from '../../types';

interface SoapGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (subjectiveData: any) => void;
    person: Person;
    loading?: boolean;
}

const SoapGeneratorModal: FC<SoapGeneratorModalProps> = ({ isOpen, onClose, onGenerate, person, loading }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        appetite: 'Normal',
        digestive_issues: 'Ninguno',
        sleep_quality: 'Buena',
        sleep_hours: '7-8',
        stress_level: 'Medio',
        energy_level: 'Bueno',
        water_intake: 'Adecuado',
        exercise_frequency: 'Sedentario',
        alcohol_consumption: 'No',
        smoking: 'No',
        recent_changes: 'Ninguno',
        symptoms: ''
    });

    if (!isOpen) return null;

    const handleNext = () => {
        if (step < 3) setStep(step + 1);
        else onGenerate(formData);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const renderStep1 = () => (
        <div className="fade-in">
            <h4 style={{marginBottom: '1rem', color: 'var(--primary-color)'}}>1. Estado General y Estilo de Vida</h4>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                <div>
                    <label style={styles.label}>Apetito</label>
                    <select 
                        style={styles.input}
                        value={formData.appetite}
                        onChange={e => setFormData({...formData, appetite: e.target.value})}
                    >
                        <option value="Malo">Malo / Sin hambre</option>
                        <option value="Regular">Regular</option>
                        <option value="Normal">Normal</option>
                        <option value="Aumentado">Aumentado / Ansiedad</option>
                        <option value="Excesivo">Excesivo</option>
                    </select>
                </div>
                <div>
                    <label style={styles.label}>Nivel de Energía</label>
                    <select 
                        style={styles.input}
                        value={formData.energy_level}
                        onChange={e => setFormData({...formData, energy_level: e.target.value})}
                    >
                        <option value="Muy bajo">Muy bajo / Fatiga</option>
                        <option value="Bajo">Bajo</option>
                        <option value="Bueno">Bueno / Normal</option>
                        <option value="Alto">Alto</option>
                    </select>
                </div>
                <div>
                    <label style={styles.label}>Calidad de Sueño</label>
                    <select 
                        style={styles.input}
                        value={formData.sleep_quality}
                        onChange={e => setFormData({...formData, sleep_quality: e.target.value})}
                    >
                        <option value="Mala">Mala / Insomnio</option>
                        <option value="Regular">Regular / Interrumpido</option>
                        <option value="Buena">Buena</option>
                        <option value="Excelente">Excelente</option>
                    </select>
                </div>
                <div>
                    <label style={styles.label}>Horas de Sueño</label>
                    <select 
                        style={styles.input}
                        value={formData.sleep_hours}
                        onChange={e => setFormData({...formData, sleep_hours: e.target.value})}
                    >
                        <option value="<5">Menos de 5 horas</option>
                        <option value="5-6">5-6 horas</option>
                        <option value="7-8">7-8 horas</option>
                        <option value=">8">Más de 8 horas</option>
                    </select>
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="fade-in">
            <h4 style={{marginBottom: '1rem', color: 'var(--primary-color)'}}>2. Digestión y Hábitos</h4>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                <div>
                    <label style={styles.label}>Problemas Digestivos</label>
                    <select 
                        style={styles.input}
                        value={formData.digestive_issues}
                        onChange={e => setFormData({...formData, digestive_issues: e.target.value})}
                    >
                        <option value="Ninguno">Ninguno</option>
                        <option value="Estreñimiento">Estreñimiento</option>
                        <option value="Diarrea">Diarrea</option>
                        <option value="Distensión">Distensión / Gases</option>
                        <option value="Reflujo">Reflujo / Gastritis</option>
                        <option value="Colitis">Colitis</option>
                    </select>
                </div>
                <div>
                    <label style={styles.label}>Consumo de Agua</label>
                    <select 
                        style={styles.input}
                        value={formData.water_intake}
                        onChange={e => setFormData({...formData, water_intake: e.target.value})}
                    >
                        <option value="Bajo">Bajo (menos de 1L)</option>
                        <option value="Regular">Regular (1-1.5L)</option>
                        <option value="Adecuado">Adecuado (1.5-2.5L)</option>
                        <option value="Alto">Alto (más de 2.5L)</option>
                    </select>
                </div>
                <div>
                    <label style={styles.label}>Nivel de Estrés</label>
                    <select 
                        style={styles.input}
                        value={formData.stress_level}
                        onChange={e => setFormData({...formData, stress_level: e.target.value})}
                    >
                        <option value="Bajo">Bajo</option>
                        <option value="Medio">Medio</option>
                        <option value="Alto">Alto</option>
                        <option value="Muy Alto">Muy Alto</option>
                    </select>
                </div>
                <div>
                    <label style={styles.label}>Actividad Física</label>
                    <select 
                        style={styles.input}
                        value={formData.exercise_frequency}
                        onChange={e => setFormData({...formData, exercise_frequency: e.target.value})}
                    >
                        <option value="Sedentario">Sedentario</option>
                        <option value="Ligero">Ligero (1-2 veces/sem)</option>
                        <option value="Moderado">Moderado (3-4 veces/sem)</option>
                        <option value="Activo">Activo (5+ veces/sem)</option>
                        <option value="Atleta">Atleta / Alto Rendimiento</option>
                    </select>
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="fade-in">
            <h4 style={{marginBottom: '1rem', color: 'var(--primary-color)'}}>3. Síntomas y Cambios Recientes</h4>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                <div>
                    <label style={styles.label}>¿Ha notado cambios recientes en su salud?</label>
                    <textarea 
                        style={{...styles.input, height: '80px'}}
                        value={formData.recent_changes}
                        onChange={e => setFormData({...formData, recent_changes: e.target.value})}
                        placeholder="Ej. Pérdida de peso repentina, caída de cabello, etc."
                    />
                </div>
                <div>
                    <label style={styles.label}>Síntomas Específicos (Opcional)</label>
                    <textarea 
                        style={{...styles.input, height: '80px'}}
                        value={formData.symptoms}
                        onChange={e => setFormData({...formData, symptoms: e.target.value})}
                        placeholder="Describa cualquier síntoma relevante..."
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div style={{...styles.modalOverlay, zIndex: 3000}}>
            <div style={{...styles.modalContent, maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto'}}>
                <div style={styles.modalHeader}>
                    <h3 style={styles.modalTitle}>Generador de Nota Clínica (SOAP)</h3>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                
                <div style={styles.modalBody}>
                    <div style={{display: 'flex', justifyContent: 'center', marginBottom: '1.5rem'}}>
                        <div style={{display: 'flex', gap: '0.5rem'}}>
                            {[1, 2, 3].map(s => (
                                <div key={s} style={{
                                    width: '10px', height: '10px', borderRadius: '50%',
                                    backgroundColor: s === step ? 'var(--primary-color)' : '#E5E7EB',
                                    transition: 'background-color 0.3s'
                                }} />
                            ))}
                        </div>
                    </div>

                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}

                    <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '2rem'}}>
                        <button 
                            onClick={handleBack} 
                            disabled={step === 1}
                            style={{
                                ...styles.buttonSecondary, 
                                opacity: step === 1 ? 0.5 : 1,
                                cursor: step === 1 ? 'default' : 'pointer'
                            }}
                        >
                            Atrás
                        </button>
                        <button 
                            onClick={handleNext}
                            disabled={loading}
                            style={{
                                ...styles.buttonPrimary,
                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}
                        >
                            {loading ? 'Generando...' : step === 3 ? (
                                <>
                                    {ICONS.sparkles} Generar Nota con IA
                                </>
                            ) : 'Siguiente'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SoapGeneratorModal;
