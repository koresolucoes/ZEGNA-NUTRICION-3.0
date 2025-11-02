import React, { FC, useState, FormEvent, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { Person } from '../../types';
import { supabase, Database } from '../../supabase';

interface QuickConsultationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    clients: Pick<Person, 'id' | 'full_name' | 'avatar_url'>[];
    afiliados: Pick<Person, 'id' | 'full_name' | 'avatar_url'>[];
}

const modalRoot = document.getElementById('modal-root');

const QuickConsultationModal: FC<QuickConsultationModalProps> = ({ isOpen, onClose, onSave, clients, afiliados }) => {
    const [selectedPersonId, setSelectedPersonId] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [ta, setTa] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredClients = useMemo(() => {
        if (!searchTerm) return clients;
        return clients.filter(c => c.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [clients, searchTerm]);

    const filteredAfiliados = useMemo(() => {
        if (!searchTerm) return afiliados;
        return afiliados.filter(a => a.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [afiliados, searchTerm]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!selectedPersonId) {
            setError("Por favor, selecciona un paciente o afiliado.");
            return;
        }
        setLoading(true);

        try {
            const w = weight ? parseFloat(weight) : null;
            const h = height ? parseFloat(height) : null;
            let imc: number | null = null;
            if (w && h) {
                imc = parseFloat((w / ((h / 100) ** 2)).toFixed(2));
            }
            
            const payload: Database['public']['Tables']['consultations']['Insert'] = {
                person_id: selectedPersonId,
                consultation_date: new Date().toISOString().split('T')[0],
                weight_kg: w,
                height_cm: h,
                imc,
                ta: ta || null,
                notes: notes || `Consulta rápida registrada desde el dashboard.`
            };

            const { error: dbError } = await supabase.from('consultations').insert(payload);
            if (dbError) throw dbError;
            
            onSave();
        } catch (err: any) {
            setError(`Error al guardar la consulta: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '500px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Consulta Rápida</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}><span className="sr-only">Cerrar</span>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    <label htmlFor="person-select">Paciente o Afiliado *</label>
                     <input 
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ marginBottom: '0.5rem' }}
                    />
                    <select id="person-select" value={selectedPersonId} onChange={e => setSelectedPersonId(e.target.value)} required>
                        <option value="" disabled>Selecciona...</option>
                        {filteredClients.length > 0 && (
                            <optgroup label="Pacientes">
                                {filteredClients.map(c => <option key={`person-${c.id}`} value={c.id}>{c.full_name}</option>)}
                            </optgroup>
                        )}
                         {filteredAfiliados.length > 0 && (
                            <optgroup label="Afiliados">
                                {filteredAfiliados.map(m => <option key={`person-${m.id}`} value={m.id}>{m.full_name}</option>)}
                            </optgroup>
                         )}
                    </select>
                    
                    <div style={{display: 'flex', gap: '1rem'}}>
                        <div style={{flex: 1}}>
                            <label htmlFor="quick-weight">Peso (kg)</label>
                            <input id="quick-weight" type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} />
                        </div>
                         <div style={{flex: 1}}>
                            <label htmlFor="quick-height">Altura (cm)</label>
                            <input id="quick-height" type="number" step="0.1" value={height} onChange={e => setHeight(e.target.value)} />
                        </div>
                    </div>
                     <label htmlFor="quick-ta">Tensión Arterial (TA)</label>
                     <input id="quick-ta" type="text" value={ta} onChange={e => setTa(e.target.value)} placeholder="Ej: 120/80" />
                     <label htmlFor="quick-notes">Notas (Opcional)</label>
                     <textarea id="quick-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notas breves de la consulta..."></textarea>
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary">Cancelar</button>
                    <button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Consulta'}</button>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

export default QuickConsultationModal;