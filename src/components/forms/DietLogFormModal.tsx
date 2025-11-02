import React, { FC, useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { DietLog } from '../../types';

interface DietLogFormModalProps {
    logToEdit: DietLog | null;
    personId: string;
    onClose: () => void;
}

const modalRoot = document.getElementById('modal-root');

const DietLogFormModal: FC<DietLogFormModalProps> = ({ logToEdit, personId, onClose }) => {
    const [formData, setFormData] = useState({
        log_date: new Date().toISOString().split('T')[0],
        desayuno: '', colacion_1: '', comida: '', colacion_2: '', cena: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (logToEdit) {
            setFormData({
                log_date: logToEdit.log_date,
                desayuno: logToEdit.desayuno || '',
                colacion_1: logToEdit.colacion_1 || '',
                comida: logToEdit.comida || '',
                colacion_2: logToEdit.colacion_2 || '',
                cena: logToEdit.cena || '',
            });
        }
    }, [logToEdit]);

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

            const payload = {
                person_id: personId,
                log_date: formData.log_date,
                desayuno: formData.desayuno || null,
                colacion_1: formData.colacion_1 || null,
                comida: formData.comida || null,
                colacion_2: formData.colacion_2 || null,
                cena: formData.cena || null,
                created_by_user_id: session.user.id,
            };

            if (logToEdit) {
                const { error: dbError } = await supabase.from('diet_logs').update(payload).eq('id', logToEdit.id);
                if (dbError) throw dbError;
            } else {
                const { error: dbError } = await supabase.from('diet_logs').insert(payload);
                if (dbError) throw dbError;
            }
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const modalContent = (
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '600px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>{logToEdit ? 'Editar Plan del Día' : 'Agregar Día al Plan'}</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    <label htmlFor="log_date">Fecha</label>
                    <input id="log_date" name="log_date" type="date" value={formData.log_date} onChange={handleChange} required />
                    
                    <label htmlFor="desayuno">Desayuno</label>
                    <textarea id="desayuno" name="desayuno" value={formData.desayuno} onChange={handleChange} rows={2} />
                    
                    <label htmlFor="colacion_1">Colación 1</label>
                    <textarea id="colacion_1" name="colacion_1" value={formData.colacion_1} onChange={handleChange} rows={2} />
                    
                    <label htmlFor="comida">Comida</label>
                    <textarea id="comida" name="comida" value={formData.comida} onChange={handleChange} rows={2} />
                    
                    <label htmlFor="colacion_2">Colación 2</label>
                    <textarea id="colacion_2" name="colacion_2" value={formData.colacion_2} onChange={handleChange} rows={2} />
                    
                    <label htmlFor="cena">Cena</label>
                    <textarea id="cena" name="cena" value={formData.cena} onChange={handleChange} rows={2} />
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary">Cancelar</button>
                    <button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Cambios'}</button>
                </div>
            </form>
        </div>
    );
    
    if (!modalRoot) return null;
    return createPortal(modalContent, modalRoot);
};

export default DietLogFormModal;
