import React, { FC, useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { User } from '@supabase/supabase-js';
import { supabase, Json } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { PlanTemplate, DietDayTemplate, ExerciseDayTemplate, Exercise } from '../../types';
import { useClinic } from '../../contexts/ClinicContext';

interface PlanTemplateFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    templateToEdit: PlanTemplate | null;
}

const modalRoot = document.getElementById('modal-root');

const PlanTemplateFormModal: FC<PlanTemplateFormModalProps> = ({ isOpen, onClose, user, templateToEdit }) => {
    const { clinic } = useClinic();
    // State for basic template info
    const [title, setTitle] = useState('');
    const [type, setType] = useState('Alimenticio');
    const [description, setDescription] = useState('');

    // State for the dynamic plan builders
    const [dietPlan, setDietPlan] = useState<DietDayTemplate[]>([]);
    const [exercisePlan, setExercisePlan] = useState<ExerciseDayTemplate[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (templateToEdit) {
            setTitle(templateToEdit.title);
            setType(templateToEdit.type);
            setDescription(templateToEdit.description || '');

            if (templateToEdit.template_data) {
                const data = templateToEdit.template_data as any;
                if (templateToEdit.type === 'Alimenticio' && data.plan_semanal) {
                    setDietPlan(data.plan_semanal);
                } else if (templateToEdit.type === 'Ejercicio' && data.plan_semanal) {
                    setExercisePlan(data.plan_semanal);
                }
            }
        } else {
            // Reset form when opening for a new template
            setTitle('');
            setType('Alimenticio');
            setDescription('');
            setDietPlan([]);
            setExercisePlan([]);
        }
    }, [templateToEdit, isOpen]); // Rerun effect when modal opens

    // --- DIET PLAN HANDLERS ---
    const addDietDay = () => setDietPlan([...dietPlan, { dia: `Día ${dietPlan.length + 1}`, desayuno: '', colacion_1: '', comida: '', colacion_2: '', cena: '' }]);
    const removeDietDay = (index: number) => setDietPlan(dietPlan.filter((_, i) => i !== index));
    const handleDietDayChange = (index: number, field: keyof DietDayTemplate, value: string) => {
        const updatedPlan = [...dietPlan];
        updatedPlan[index] = { ...updatedPlan[index], [field]: value };
        setDietPlan(updatedPlan);
    };

    // --- EXERCISE PLAN HANDLERS ---
    const addExerciseDay = () => setExercisePlan([...exercisePlan, { dia: `Día ${exercisePlan.length + 1}`, enfoque: '', ejercicios: [] }]);
    const removeExerciseDay = (dayIndex: number) => setExercisePlan(exercisePlan.filter((_, i) => i !== dayIndex));
    const handleExerciseDayChange = (dayIndex: number, field: 'dia' | 'enfoque', value: string) => {
        const updatedPlan = [...exercisePlan];
        updatedPlan[dayIndex] = { ...updatedPlan[dayIndex], [field]: value };
        setExercisePlan(updatedPlan);
    };
    const addExercise = (dayIndex: number) => {
        const updatedPlan = [...exercisePlan];
        updatedPlan[dayIndex].ejercicios.push({ nombre: '', series: '', repeticiones: '', descanso: '' });
        setExercisePlan(updatedPlan);
    };
    const removeExercise = (dayIndex: number, exIndex: number) => {
        const updatedPlan = [...exercisePlan];
        updatedPlan[dayIndex].ejercicios = updatedPlan[dayIndex].ejercicios.filter((_, i) => i !== exIndex);
        setExercisePlan(updatedPlan);
    };
    const handleExerciseChange = (dayIndex: number, exIndex: number, field: keyof Exercise, value: string) => {
        const updatedPlan = [...exercisePlan];
        updatedPlan[dayIndex].ejercicios[exIndex] = { ...updatedPlan[dayIndex].ejercicios[exIndex], [field]: value };
        setExercisePlan(updatedPlan);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!clinic) { setError("No se pudo identificar la clínica. Intenta refrescar la página."); return; }
        setLoading(true);
        setError(null);
        
        const template_data = {
            plan_semanal: type === 'Alimenticio' ? dietPlan : exercisePlan
        };

        try {
            const payload = { 
                title, type, description, 
                template_data: template_data as unknown as Json,
                clinic_id: clinic.id,
            };

            if (templateToEdit) {
                const { error: dbError } = await supabase.from('plan_templates').update(payload).eq('id', templateToEdit.id);
                if (dbError) throw dbError;
            } else {
                const { error: dbError } = await supabase.from('plan_templates').insert(payload);
                if (dbError) throw dbError;
            }
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !modalRoot) return null;

    const dayCardStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-hover-color)',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1rem',
        border: `1px solid var(--border-color)`
    };

    const dayHeaderStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
    };

    return createPortal(
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '800px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>{templateToEdit ? 'Editar Plantilla' : 'Nueva Plantilla'}</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    
                    <label htmlFor="title">Título de la Plantilla *</label>
                    <input id="title" name="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
                    
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem'}}>
                        <div>
                            <label htmlFor="type">Tipo de Plantilla</label>
                            <select id="type" name="type" value={type} onChange={(e) => setType(e.target.value)}>
                                <option value="Alimenticio">Alimenticio</option>
                                <option value="Ejercicio">Ejercicio</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="description">Descripción</label>
                            <input id="description" name="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                    </div>

                    <hr style={{border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0'}} />

                    {type === 'Alimenticio' && (
                        <div>
                            <h3 style={{fontSize: '1.1rem', marginBottom: '1rem'}}>Constructor del Plan Alimenticio</h3>
                            {dietPlan.map((day, index) => (
                                <div key={index} style={dayCardStyle}>
                                    <div style={dayHeaderStyle}>
                                        <input type="text" value={day.dia} onChange={e => handleDietDayChange(index, 'dia', e.target.value)} style={{margin: 0, fontSize: '1.1rem', fontWeight: 600, background: 'transparent', border: 'none', color: 'var(--primary-color)'}}/>
                                        <button type="button" onClick={() => removeDietDay(index)} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar día">{ICONS.delete}</button>
                                    </div>
                                    <label>Desayuno</label><textarea value={day.desayuno} onChange={e => handleDietDayChange(index, 'desayuno', e.target.value)} rows={2}/>
                                    <label>Colación 1</label><textarea value={day.colacion_1} onChange={e => handleDietDayChange(index, 'colacion_1', e.target.value)} rows={1}/>
                                    <label>Comida</label><textarea value={day.comida} onChange={e => handleDietDayChange(index, 'comida', e.target.value)} rows={2}/>
                                    <label>Colación 2</label><textarea value={day.colacion_2} onChange={e => handleDietDayChange(index, 'colacion_2', e.target.value)} rows={1}/>
                                    <label>Cena</label><textarea value={day.cena} onChange={e => handleDietDayChange(index, 'cena', e.target.value)} rows={2}/>
                                </div>
                            ))}
                            <button type="button" onClick={addDietDay} className="button-secondary">{ICONS.add} Agregar Día</button>
                        </div>
                    )}

                    {type === 'Ejercicio' && (
                        <div>
                             <h3 style={{fontSize: '1.1rem', marginBottom: '1rem'}}>Constructor de Rutina de Ejercicio</h3>
                             {exercisePlan.map((day, dayIndex) => (
                                <div key={dayIndex} style={dayCardStyle}>
                                    <div style={dayHeaderStyle}>
                                        <div style={{display: 'flex', gap: '1rem', flex: 1}}>
                                           <input type="text" value={day.dia} onChange={e => handleExerciseDayChange(dayIndex, 'dia', e.target.value)} style={{margin: 0, flex: 1}} placeholder="Día (ej. Lunes)"/>
                                           <input type="text" value={day.enfoque} onChange={e => handleExerciseDayChange(dayIndex, 'enfoque', e.target.value)} style={{margin: 0, flex: 2}} placeholder="Enfoque (ej. Tren superior)"/>
                                        </div>
                                        <button type="button" onClick={() => removeExerciseDay(dayIndex)} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar día">{ICONS.delete}</button>
                                    </div>
                                    {day.ejercicios.map((ex, exIndex) => (
                                        <div key={exIndex} style={{display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '0.5rem'}}>
                                            <input type="text" value={ex.nombre} onChange={e => handleExerciseChange(dayIndex, exIndex, 'nombre', e.target.value)} placeholder="Nombre del ejercicio" style={{marginBottom: 0}} />
                                            <input type="text" value={ex.series} onChange={e => handleExerciseChange(dayIndex, exIndex, 'series', e.target.value)} placeholder="Series" style={{marginBottom: 0}} />
                                            <input type="text" value={ex.repeticiones} onChange={e => handleExerciseChange(dayIndex, exIndex, 'repeticiones', e.target.value)} placeholder="Reps" style={{marginBottom: 0}} />
                                            <input type="text" value={ex.descanso} onChange={e => handleExerciseChange(dayIndex, exIndex, 'descanso', e.target.value)} placeholder="Descanso" style={{marginBottom: 0}} />
                                            <button type="button" onClick={() => removeExercise(dayIndex, exIndex)} className="button-secondary" style={{padding: '10px', color: 'var(--error-color)'}} title="Eliminar ejercicio">{ICONS.delete}</button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => addExercise(dayIndex)} className="button-secondary" style={{marginTop: '0.5rem', fontSize: '0.9rem', padding: '8px 12px'}}>{ICONS.add} Agregar Ejercicio</button>
                                </div>
                             ))}
                             <button type="button" onClick={addExerciseDay} className="button-secondary">{ICONS.add} Agregar Día</button>
                        </div>
                    )}
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary">Cancelar</button>
                    <button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Plantilla'}</button>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

export default PlanTemplateFormModal;