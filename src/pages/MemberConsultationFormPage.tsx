import React, { FC, useState, useEffect, FormEvent } from 'react';
import { supabase, Database } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { LabResult } from '../types';

const AfiliadoConsultationFormPage: FC<{ consultationToEditId: string | null; afiliadoId: string; onBack: () => void;}> = ({ consultationToEditId, afiliadoId: personId, onBack }) => {
    const today = new Date().toISOString().split('T')[0];
    const [formData, setFormData] = useState({
        consultation_date: today, weight_kg: '', height_cm: '', ta: '',
        glucose_mg_dl: '', hba1c: '', cholesterol_mg_dl: '', triglycerides_mg_dl: '',
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchConsultation = async () => {
            if (!consultationToEditId) return;
            setLoading(true);
            const { data: consultData, error: consultError } = await supabase
                .from('consultations')
                .select('*, lab_results(*)')
                .eq('id', consultationToEditId)
                .single();

            if (consultError && consultError.code !== 'PGRST116') {
                setError(consultError.message);
            } else if (consultData) {
                const labResults = (consultData.lab_results as LabResult[]) || [];
                setFormData({
                    consultation_date: new Date(consultData.consultation_date).toISOString().split('T')[0],
                    weight_kg: consultData.weight_kg?.toString() || '',
                    height_cm: consultData.height_cm?.toString() || '',
                    ta: consultData.ta || '',
                    glucose_mg_dl: labResults[0]?.glucose_mg_dl?.toString() || '',
                    hba1c: labResults[0]?.hba1c?.toString() || '',
                    cholesterol_mg_dl: labResults[0]?.cholesterol_mg_dl?.toString() || '',
                    triglycerides_mg_dl: labResults[0]?.triglycerides_mg_dl?.toString() || '',
                    notes: consultData.notes || '',
                });
            }
            setLoading(false);
        };
        fetchConsultation();
    }, [consultationToEditId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("User not authenticated.");

            const weight = formData.weight_kg ? parseFloat(formData.weight_kg) : null;
            const height = formData.height_cm ? parseFloat(formData.height_cm) : null;
            let imc: number | null = null;
            if (weight && height) {
                imc = parseFloat((weight / ((height / 100) ** 2)).toFixed(2));
            }
            
            let consultationId = consultationToEditId;
            let existingLabResultId: string | undefined = undefined;

            if (consultationToEditId) {
                const consultationPayload: Database['public']['Tables']['consultations']['Update'] = {
                    consultation_date: formData.consultation_date,
                    weight_kg: weight, height_cm: height, imc, ta: formData.ta || null,
                    notes: formData.notes || null,
                    nutritionist_id: session.user.id,
                };
                const { error: consultError } = await supabase.from('consultations').update(consultationPayload).eq('id', consultationToEditId);
                if (consultError) throw consultError;
                
                const { data } = await supabase.from('lab_results').select('id').eq('consultation_id', consultationToEditId).single();
                if(data) existingLabResultId = data.id;

            } else {
                const consultationPayload: Database['public']['Tables']['consultations']['Insert'] = {
                    person_id: personId,
                    consultation_date: formData.consultation_date,
                    weight_kg: weight, height_cm: height, imc, ta: formData.ta || null,
                    notes: formData.notes || null,
                    nutritionist_id: session.user.id,
                };
                const { data, error: consultError } = await supabase.from('consultations').insert(consultationPayload).select('id').single();
                if (consultError) throw consultError;
                if (!data) throw new Error("Failed to create consultation.");
                consultationId = data.id;
            }

            if (!consultationId) throw new Error("No se pudo guardar la consulta.");

            const labPayload = {
                glucose_mg_dl: formData.glucose_mg_dl ? parseFloat(formData.glucose_mg_dl) : null,
                hba1c: formData.hba1c ? parseFloat(formData.hba1c) : null,
                cholesterol_mg_dl: formData.cholesterol_mg_dl ? parseFloat(formData.cholesterol_mg_dl) : null,
                triglycerides_mg_dl: formData.triglycerides_mg_dl ? parseFloat(formData.triglycerides_mg_dl) : null,
            };

            const hasLabData = Object.values(labPayload).some(v => v !== null);

            if (hasLabData) {
                if (existingLabResultId) {
                    const dataToUpdate: Database['public']['Tables']['lab_results']['Update'] = labPayload;
                    const { error } = await supabase.from('lab_results').update(dataToUpdate).eq('id', existingLabResultId);
                    if (error) throw error;
                } else {
                    const dataToInsert: Database['public']['Tables']['lab_results']['Insert'] = { ...labPayload, consultation_id: consultationId };
                    const { error } = await supabase.from('lab_results').insert(dataToInsert);
                    if (error) throw error;
                }
            }

            onBack();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="fade-in" style={{ paddingBottom: '7rem' }}>
            <div style={styles.pageHeader}>
                <h1>{consultationToEditId ? 'Editar Consulta de Afiliado' : 'Nueva Consulta de Afiliado'}</h1>
                 <button onClick={onBack} className="button-secondary">{ICONS.back} Volver</button>
            </div>
            <form id="afiliado-consultation-form" onSubmit={handleSubmit} style={{maxWidth: '700px'}}>
                {error && <p style={styles.error}>{error}</p>}
                <h3 style={{...styles.modalTitle, fontSize: '1.1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1rem'}}>Datos de la Consulta</h3>
                <label htmlFor="consultation_date">Fecha de Consulta *</label>
                <input id="consultation_date" name="consultation_date" type="date" value={formData.consultation_date} onChange={handleChange} required />
                <div style={{display: 'flex', gap: '1rem'}}>
                    <div style={{flex: 1}}>
                        <label htmlFor="weight_kg">Peso (kg)</label>
                        <input id="weight_kg" name="weight_kg" type="number" step="0.1" value={formData.weight_kg} onChange={handleChange}/>
                    </div>
                    <div style={{flex: 1}}>
                        <label htmlFor="height_cm">Altura (cm)</label>
                        <input id="height_cm" name="height_cm" type="number" step="0.1" value={formData.height_cm} onChange={handleChange}/>
                    </div>
                </div>
                <label htmlFor="ta">Tensión Arterial (TA)</label>
                <input id="ta" name="ta" type="text" value={formData.ta} onChange={handleChange} placeholder="Ej: 120/80"/>
                
                <label htmlFor="notes">Notas de la Consulta</label>
                <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={4} placeholder="Observaciones, recomendaciones, próximos pasos..."></textarea>
                
                <h3 style={{...styles.modalTitle, fontSize: '1.1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', margin: '2rem 0 1rem 0'}}>Resultados de Laboratorio</h3>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                    <div><label htmlFor="glucose_mg_dl">Glucosa (mg/dl)</label><input id="glucose_mg_dl" name="glucose_mg_dl" type="number" step="0.1" value={formData.glucose_mg_dl} onChange={handleChange}/></div>
                    <div><label htmlFor="hba1c">HbA1c (%)</label><input id="hba1c" name="hba1c" type="number" step="0.1" value={formData.hba1c} onChange={handleChange}/></div>
                    <div><label htmlFor="cholesterol_mg_dl">Colesterol (mg/dl)</label><input id="cholesterol_mg_dl" name="cholesterol_mg_dl" type="number" step="1" value={formData.cholesterol_mg_dl} onChange={handleChange}/></div>
                    <div><label htmlFor="triglycerides_mg_dl">Triglicéridos (mg/dl)</label><input id="triglycerides_mg_dl" name="triglycerides_mg_dl" type="number" step="1" value={formData.triglycerides_mg_dl} onChange={handleChange}/></div>
                </div>
            </form>
            <div style={styles.floatingActions}>
                <button type="button" onClick={onBack} className="button-secondary">Cancelar</button>
                <button type="submit" form="afiliado-consultation-form" disabled={loading} style={styles.floatingSaveButton} aria-label={consultationToEditId ? 'Guardar Cambios' : 'Guardar Consulta'}>
                    {loading ? '...' : ICONS.save}
                </button>
            </div>
        </div>
    );
};

export default AfiliadoConsultationFormPage;