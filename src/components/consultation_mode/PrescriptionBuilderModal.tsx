import React, { FC, useState } from 'react';
import { createPortal } from 'react-dom';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { supabase } from '../../supabase';

interface PrescriptionBuilderModalProps {
    personId: string;
    onClose: () => void;
    onSave: () => void;
}

const modalRoot = document.getElementById('modal-root');

const PrescriptionBuilderModal: FC<PrescriptionBuilderModalProps> = ({ personId, onClose, onSave }) => {
    const [medications, setMedications] = useState<any[]>([{ name: '', dosage: '', frequency: '', notes: '' }]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAddRow = () => {
        setMedications([...medications, { name: '', dosage: '', frequency: '', notes: '' }]);
    };

    const handleRemoveRow = (index: number) => {
        setMedications(medications.filter((_, i) => i !== index));
    };

    const handleChange = (index: number, field: string, value: string) => {
        const newMeds = [...medications];
        newMeds[index][field] = value;
        setMedications(newMeds);
    };

    const handleSave = async () => {
        setLoading(true);
        setError(null);
        try {
            const validMeds = medications.filter(m => m.name.trim() !== '');
            if (validMeds.length === 0) {
                throw new Error('Debe agregar al menos un medicamento o suplemento.');
            }

            const inserts = validMeds.map(m => ({
                person_id: personId,
                name: m.name,
                dosage: m.dosage,
                frequency: m.frequency,
                notes: m.notes
            }));

            const { error: dbError } = await supabase.from('medications').insert(inserts);
            if (dbError) throw dbError;

            onSave();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const modalContent = (
        <div style={{...styles.modalOverlay, zIndex: 1300}}>
            <div style={{...styles.modalContent, width: '90%', maxWidth: '800px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)'}}>
                    <h2 style={{margin: 0, fontSize: '1.5rem', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        {ICONS.file} Receta / Suplementación
                    </h2>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none', backgroundColor: 'var(--surface-hover-color)'}}>{ICONS.close}</button>
                </div>

                {error && <div style={styles.errorMessage}>{error}</div>}

                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.5rem'}}>
                    {medications.map((med, index) => (
                        <div key={index} style={{...styles.card, padding: '1rem', position: 'relative'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                                <h4 style={{margin: 0, fontSize: '1rem', color: 'var(--text-color)'}}>Ítem {index + 1}</h4>
                                {medications.length > 1 && (
                                    <button onClick={() => handleRemoveRow(index)} style={{...styles.iconButton, color: 'var(--error-color)', padding: '4px', width: '28px', height: '28px'}} title="Eliminar">
                                        {ICONS.delete}
                                    </button>
                                )}
                            </div>
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Nombre del Medicamento/Suplemento *</label>
                                    <input type="text" value={med.name} onChange={(e) => handleChange(index, 'name', e.target.value)} style={styles.input} placeholder="Ej. Paracetamol 500mg" required />
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Dosis</label>
                                    <input type="text" value={med.dosage} onChange={(e) => handleChange(index, 'dosage', e.target.value)} style={styles.input} placeholder="Ej. 1 tableta" />
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Frecuencia</label>
                                    <input type="text" value={med.frequency} onChange={(e) => handleChange(index, 'frequency', e.target.value)} style={styles.input} placeholder="Ej. Cada 8 horas" />
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Indicaciones adicionales</label>
                                    <input type="text" value={med.notes} onChange={(e) => handleChange(index, 'notes', e.target.value)} style={styles.input} placeholder="Ej. Tomar con alimentos" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <button onClick={handleAddRow} className="button-secondary" style={{marginTop: '1rem', width: '100%', justifyContent: 'center', borderStyle: 'dashed'}}>
                    {ICONS.add} Agregar otro ítem
                </button>

                <div style={{marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
                    <button onClick={onClose} className="button-secondary" disabled={loading}>Cancelar</button>
                    <button onClick={handleSave} className="button-primary" disabled={loading}>
                        {loading ? 'Guardando...' : <>{ICONS.save} Guardar Receta</>}
                    </button>
                </div>
            </div>
        </div>
    );

    return modalRoot ? createPortal(modalContent, modalRoot) : null;
};

export default PrescriptionBuilderModal;
