import React, { FC, useState, useMemo, useCallback } from 'react';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { ClinicalReference, ConsultationWithLabs, Person, ClinicalReferenceContentItem } from '../../types';
import ReferenceFormModal from './ReferenceFormModal';
import ConfirmationModal from '../shared/ConfirmationModal';
import ClinicalReferenceDetailModal from './ClinicalReferenceDetailModal';

interface ClinicalReferencesProps {
    references: ClinicalReference[];
    selectedPerson: Person | null;
    lastConsultation: ConsultationWithLabs | null;
    onNavigateToToolTab: (tab: string, subTab?: string) => void;
    onDataRefresh: () => void;
}

const toolLabels: { [key: string]: string } = {
    energia: 'Requerimientos Energéticos',
    antropometria: 'Antropometría y Riesgo',
    renal: 'Función Renal',
    diabetes: 'Diabetes',
    poblaciones: 'Poblaciones Específicas',
    soporte: 'Soporte Nutricional',
    tamizaje: 'Tamizaje',
    pediatria: 'Pediatría',
};

const ClinicalReferences: FC<ClinicalReferencesProps> = ({ references, selectedPerson, lastConsultation, onNavigateToToolTab, onDataRefresh }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormModalOpen, setFormModalOpen] = useState(false);
    const [editingReference, setEditingReference] = useState<ClinicalReference | null>(null);
    const [deletingReference, setDeletingReference] = useState<ClinicalReference | null>(null);
    const [viewingReference, setViewingReference] = useState<ClinicalReference | null>(null);

    const filteredReferences = useMemo(() => {
        if (!searchTerm) return references;
        const lowercasedFilter = searchTerm.toLowerCase();
        return references.filter(ref =>
            ref.title.toLowerCase().includes(lowercasedFilter) ||
            ref.category.toLowerCase().includes(lowercasedFilter) ||
            (Array.isArray(ref.content) && ref.content.some(item => item.label.toLowerCase().includes(lowercasedFilter)))
        );
    }, [references, searchTerm]);

    const getPatientValue = useCallback((item: ClinicalReferenceContentItem) => {
        if (!lastConsultation || !item.key) return { value: null, isOutOfRange: false };

        let patientValue: number | string | null = null;
        
        if (item.key === 'bp' && lastConsultation.ta) {
            const parts = lastConsultation.ta.split('/');
            if (parts.length === 2) {
                const systolic = parseInt(parts[0], 10);
                const diastolic = parseInt(parts[1], 10);
                if (!isNaN(systolic) && !isNaN(diastolic)) {
                    patientValue = `${systolic}/${diastolic}`;
                    const threshold = item.threshold as number[];
                    const isOutOfRange = threshold && (systolic >= threshold[0] || diastolic >= threshold[1]);
                    return { value: patientValue, isOutOfRange };
                }
            }
        } else if (lastConsultation.lab_results?.[0] && item.key in lastConsultation.lab_results[0]) {
            patientValue = lastConsultation.lab_results[0][item.key as keyof typeof lastConsultation.lab_results[0]];
        // FIX: The property `lab_results` is an array. Added a check to ensure `patientValue` is not assigned an array, which was causing a type error.
        } else if (item.key in lastConsultation && item.key !== 'lab_results') {
            patientValue = lastConsultation[item.key as keyof typeof lastConsultation];
        }

        if (patientValue === null || patientValue === undefined) return { value: null, isOutOfRange: false };

        const numericValue = typeof patientValue === 'string' ? parseFloat(patientValue) : patientValue as number;
        let isOutOfRange = false;
        if (item.check && typeof item.threshold === 'number' && !isNaN(numericValue)) {
            if (item.check === 'high' && numericValue >= item.threshold) isOutOfRange = true;
            if (item.check === 'low' && numericValue < item.threshold) isOutOfRange = true;
        }

        return { value: patientValue, isOutOfRange };
    }, [lastConsultation]);

    const handleEdit = (ref: ClinicalReference) => {
        setEditingReference(ref);
        setFormModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deletingReference) return;
        
        const { error } = await supabase.from('clinical_references').delete().eq('id', deletingReference.id);
        
        if (error) {
            console.error("Error deleting reference:", error);
        } else {
            onDataRefresh();
        }
        setDeletingReference(null);
    };

    return (
        <div className="fade-in" style={{ position: 'relative', paddingBottom: '5rem' }}>
            {isFormModalOpen && (
                <ReferenceFormModal
                    isOpen={isFormModalOpen}
                    onClose={() => { setFormModalOpen(false); setEditingReference(null); }}
                    onSave={() => { setFormModalOpen(false); setEditingReference(null); onDataRefresh(); }}
                    referenceToEdit={editingReference}
                />
            )}
            {deletingReference && (
                <ConfirmationModal
                    isOpen={!!deletingReference}
                    onClose={() => setDeletingReference(null)}
                    onConfirm={handleDeleteConfirm}
                    title="Confirmar Eliminación"
                    message={<p>¿Estás seguro de que quieres eliminar la referencia "<strong>{deletingReference.title}</strong>"? Esta acción es irreversible.</p>}
                />
            )}
            {viewingReference && (
                <ClinicalReferenceDetailModal
                    reference={viewingReference}
                    selectedPerson={selectedPerson}
                    lastConsultation={lastConsultation}
                    onClose={() => setViewingReference(null)}
                />
            )}

            <div style={{...styles.filterBar, marginBottom: '1.5rem'}}>
                <div style={styles.searchInputContainer}>
                    <span style={styles.searchInputIcon}>🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar referencia por título, categoría..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>
            </div>
            
            {filteredReferences.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                    {filteredReferences.map(ref => {
                         const contentArray = Array.isArray(ref.content) ? ref.content : [];
                         
                         let toolKey: string | null | undefined = ref.linked_tool;
                         if (!toolKey) {
                             if (ref.category === 'Diabetes') toolKey = 'diabetes';
                             else if (ref.category === 'Renal') toolKey = 'renal';
                         }
                         const showButton = !!toolKey;
                         const buttonLabel = toolKey ? toolLabels[toolKey] : 'Herramientas Clínicas';

                         return (
                            <div 
                                key={ref.id} 
                                onClick={() => setViewingReference(ref)}
                                className="card-hover" 
                                style={{...styles.infoCard, flexDirection: 'column', alignItems: 'stretch', padding: 0, transition: 'transform 0.2s, box-shadow 0.2s', border: '1px solid var(--border-color)', cursor: 'pointer'}}
                            >
                                <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                                    {ref.icon_svg && <span style={{ color: 'var(--primary-color)' }} dangerouslySetInnerHTML={{ __html: ref.icon_svg }} />}
                                    <div style={{flex: 1}}>
                                        <h4 style={{ margin: 0, color: 'var(--primary-color)' }}>{ref.title}</h4>
                                        {ref.source && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-light)' }}>Fuente: {ref.source}</p>}
                                    </div>
                                    {ref.user_id && ( // Show actions only for user-created cards
                                        <div className="card-actions" style={{opacity: 1}}>
                                            <button onClick={(e) => { e.stopPropagation(); handleEdit(ref); }} style={styles.iconButton} title="Editar">{ICONS.edit}</button>
                                            <button onClick={(e) => { e.stopPropagation(); setDeletingReference(ref); }} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar">{ICONS.delete}</button>
                                        </div>
                                    )}
                                </div>
                                <ul style={{ listStyle: 'none', padding: '1rem', margin: 0, flex: 1 }}>
                                    {contentArray.map((item, index) => {
                                        const patientData = getPatientValue(item);
                                        return (
                                            <li key={index} style={{ marginBottom: '0.75rem' }}>
                                                <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>{item.label}</span>
                                                    <span style={{ fontWeight: 600 }}>{item.value}</span>
                                                </p>
                                                {selectedPerson && patientData.value !== null && (
                                                    <p style={{ margin: '0.25rem 0 0 1rem', fontSize: '0.9rem', color: patientData.isOutOfRange ? 'var(--error-color)' : 'var(--primary-color)', fontWeight: 500, textAlign: 'right' }}>
                                                        Dato Paciente: {patientData.value} {patientData.isOutOfRange && '⚠️'}
                                                    </p>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                                {showButton &&
                                    <div style={{padding: '1rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--surface-hover-color)'}}>
                                        <p style={{fontWeight: 600, margin: '0 0 0.5rem 0', fontSize: '0.9rem'}}>Herramientas Relacionadas</p>
                                        <button onClick={(e) => { e.stopPropagation(); onNavigateToToolTab('tools', toolKey || undefined); }} className="button-secondary" style={{padding: '6px 12px', fontSize: '0.85rem'}}>
                                            Ir a {buttonLabel}
                                        </button>
                                    </div>
                                }
                            </div>
                        )}
                    )}
                </div>
            ) : (
                 <p style={{textAlign: 'center', padding: '2rem'}}>No se encontraron referencias con los filtros aplicados.</p>
            )}

            <button 
                onClick={() => { setEditingReference(null); setFormModalOpen(true); }}
                style={{
                    position: 'fixed', 
                    bottom: '2rem', 
                    right: '2rem', 
                    width: '60px', 
                    height: '60px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '2rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                    zIndex: 1040 // Below main FAB
                }}
                aria-label="Agregar nueva referencia"
            >
                +
            </button>
        </div>
    );
};

export default ClinicalReferences;