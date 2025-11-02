import React, { FC, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { WhatsappContact, Person } from '../../types';

interface ManageContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    contact: WhatsappContact;
    clinicId: string;
    onDelete: () => void;
}

const modalRoot = document.getElementById('modal-root');

const ManageContactModal: FC<ManageContactModalProps> = ({ isOpen, onClose, onSuccess, contact, clinicId, onDelete }) => {
    // FIX: Changed the state type for `persons` to `Pick<Person, 'id' | 'full_name'>[]` to match the data being selected from Supabase, resolving the type mismatch.
    const [persons, setPersons] = useState<Pick<Person, 'id' | 'full_name'>[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPersons = async () => {
            const { data, error } = await supabase.from('persons').select('id, full_name').eq('clinic_id', clinicId).order('full_name');
            if (error) { setError(error.message); } else { setPersons(data || []); }
        };
        fetchPersons();
    }, [clinicId]);

    const filteredPersons = useMemo(() => {
        if (!searchTerm) return persons;
        return persons.filter(p => p.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [persons, searchTerm]);

    const handleSubmit = async () => {
        if (!selectedPersonId) return;
        setLoading(true);
        setError(null);
        try {
            const selectedPerson = persons.find(p => p.id === selectedPersonId);
            if (!selectedPerson) throw new Error("Selected person not found.");

            const { error: updateError } = await supabase
                .from('whatsapp_contacts')
                .update({ person_id: selectedPerson.id, person_name: selectedPerson.full_name })
                .eq('id', contact.id);

            if (updateError) throw updateError;
            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleUnlink = async () => {
        setLoading(true);
        setError(null);
        try {
             const { error: updateError } = await supabase
                .from('whatsapp_contacts')
                .update({ person_id: null, person_name: null })
                .eq('id', contact.id);
            if (updateError) throw updateError;
            onSuccess();
        } catch (err: any) {
             setError(err.message);
        } finally {
            setLoading(false);
        }
    }


    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '500px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Gestionar Contacto</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    <p>Asocia este número de WhatsApp (<strong>{contact.phone_number}</strong>) a un expediente de paciente o afiliado existente.</p>
                    {error && <p style={styles.error}>{error}</p>}
                    
                    {contact.person_id ? (
                        <div style={{padding: '1rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px'}}>
                            <p style={{margin: 0}}>Este contacto ya está asociado a:</p>
                            <p style={{margin: '0.25rem 0 1rem 0', fontWeight: 600, color: 'var(--primary-color)'}}>{contact.person_name}</p>
                            <button onClick={handleUnlink} className="button-secondary" disabled={loading}>Desvincular Contacto</button>
                        </div>
                    ) : (
                        <>
                            <input type="text" placeholder="Buscar paciente/afiliado..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            <div style={{maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '0.5rem'}}>
                                {filteredPersons.map(p => (
                                    <div key={p.id} onClick={() => setSelectedPersonId(p.id)} style={{ padding: '0.75rem', cursor: 'pointer', backgroundColor: selectedPersonId === p.id ? 'var(--primary-color)' : 'transparent', color: selectedPersonId === p.id ? 'white' : 'var(--text-color)' }} className="nav-item-hover">
                                        {p.full_name}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    <div style={{marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem'}}>
                        <h4 style={{margin: '0 0 1rem 0', color: 'var(--error-color)'}}>Zona de Peligro</h4>
                        <button type="button" onClick={onDelete} className="button-danger">
                            {ICONS.delete} Eliminar Conversación
                        </button>
                        <p style={{fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.5rem'}}>
                            Esto eliminará permanentemente al contacto y todos sus mensajes de la plataforma.
                        </p>
                    </div>

                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary" disabled={loading}>Cerrar</button>
                    {!contact.person_id && <button onClick={handleSubmit} disabled={loading || !selectedPersonId}>{loading ? 'Asociando...' : 'Asociar'}</button>}
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default ManageContactModal;