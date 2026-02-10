

import React, { FC, useState, useMemo, useCallback } from 'react';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { ClinicalReference, ConsultationWithLabs, Person, ClinicalReferenceContentItem } from '../../types';
import ReferenceFormModal from './ReferenceFormModal';
import ConfirmationModal from '../shared/ConfirmationModal';
import ClinicalReferenceDetailModal from './ClinicalReferenceDetailModal';
import HelpTooltip from './tools/shared/HelpTooltip';

interface ClinicalReferencesProps {
    references: ClinicalReference[];
    selectedPerson: Person | null;
    lastConsultation: ConsultationWithLabs | null;
    onNavigateToToolTab: (tab: string, subTab?: string) => void;
    onDataRefresh: () => void;
}

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
            (Array.isArray(ref.content) && ref.content.some((item: any) => item.label && typeof item.label === 'string' && item.label.toLowerCase().includes(lowercasedFilter)))
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
             const labResults = lastConsultation.lab_results[0] as any;
             patientValue = labResults[item.key];
        } else if (item.key in lastConsultation) {
            const val = (lastConsultation as any)[item.key];
            if (typeof val === 'string' || typeof val === 'number') {
                patientValue = val;
            }
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
        if (ref.id.startsWith('default-')) return;
        setEditingReference(ref);
        setFormModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deletingReference) return;
        const { error } = await supabase.from('clinical_references').delete().eq('id', deletingReference.id);
        if (error) console.error("Error deleting reference:", error);
        else onDataRefresh();
        setDeletingReference(null);
    };

    return (
        <div className="fade-in" style={{ position: 'relative', paddingBottom: '5rem' }}>
            {isFormModalOpen && <ReferenceFormModal isOpen={isFormModalOpen} onClose={() => { setFormModalOpen(false); setEditingReference(null); }} onSave={() => { setFormModalOpen(false); setEditingReference(null); onDataRefresh(); }} referenceToEdit={editingReference} />}
            {deletingReference && <ConfirmationModal isOpen={!!deletingReference} onClose={() => setDeletingReference(null)} onConfirm={handleDeleteConfirm} title="Confirmar Eliminación" message={<p>¿Estás seguro de que quieres eliminar la referencia "<strong>{deletingReference.title}</strong>"?</p>} />}
            {viewingReference && <ClinicalReferenceDetailModal reference={viewingReference} selectedPerson={selectedPerson} lastConsultation={lastConsultation} onClose={() => setViewingReference(null)} />}

            <div style={{...styles.filterBar, marginBottom: '1.5rem', maxWidth: '500px', border: 'none', background: 'transparent', padding: 0, boxShadow: 'none'}}>
                <div style={styles.searchInputContainer}>
                    <span style={styles.searchInputIcon}>🔍</span>
                    <input 
                        type="text" 
                        placeholder="Buscar referencia por título, categoría..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        style={{...styles.searchInput, backgroundColor: 'var(--surface-color)', borderRadius: '12px', borderColor: 'var(--border-color)', paddingLeft: '2.5rem'}}
                    />
                </div>
            </div>
            
            {filteredReferences.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {filteredReferences.map(ref => {
                         const contentArray = (Array.isArray(ref.content) ? ref.content : []) as ClinicalReferenceContentItem[];
                         const isSystemDefault = ref.id.startsWith('default-');

                         return (
                            <div key={ref.id} onClick={() => setViewingReference(ref)} className="card-hover" style={{...styles.infoCard, flexDirection: 'column', alignItems: 'stretch', padding: 0, transition: 'transform 0.2s, box-shadow 0.2s', border: '1px solid var(--border-color)', cursor: 'pointer', backgroundColor: 'var(--surface-color)', borderRadius: '16px'}}>
                                <div style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                                    <div style={{ color: 'var(--primary-color)', backgroundColor: 'var(--primary-light)', padding: '0.6rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} dangerouslySetInnerHTML={{ __html: ref.icon_svg || '' }}></div>
                                    <div style={{flex: 1}}>
                                        <h4 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1rem', fontWeight: 700 }}>{ref.title}</h4>
                                        {ref.source && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-light)' }}>{ref.source}</p>}
                                    </div>
                                </div>
                                <div style={{ padding: '1.25rem', flex: 1 }}>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                        {contentArray.slice(0, 3).map((item, index) => {
                                            const patientData = getPatientValue(item);
                                            return (
                                                <li key={index} style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                                            <span style={{color: 'var(--text-light)'}}>{item.label}</span>
                                                        </div>
                                                        <span style={{ fontWeight: 600 }}>{item.value}</span>
                                                    </div>
                                                    {selectedPerson && patientData.value !== null && (
                                                        <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: patientData.isOutOfRange ? 'var(--error-color)' : 'var(--primary-color)', fontWeight: 600, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                                            <span>{patientData.isOutOfRange && '⚠️'} Tu Paciente: {patientData.value}</span>
                                                        </div>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    <div style={{marginTop: '0.5rem', textAlign: 'center'}}>
                                         <button className="button-secondary" style={{width: '100%', fontSize: '0.85rem', padding: '0.5rem'}}>Ver Ficha Completa</button>
                                    </div>
                                </div>
                                {!isSystemDefault && ref.user_id && (
                                    <div style={{padding: '0.5rem 1.25rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--surface-hover-color)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center'}}>
                                        <div style={{display: 'flex', gap: '0.5rem'}}>
                                            <button onClick={(e) => { e.stopPropagation(); handleEdit(ref); }} style={{...styles.iconButton, width: '28px', height: '28px', padding: '4px'}} title="Editar">{ICONS.edit}</button>
                                            <button onClick={(e) => { e.stopPropagation(); setDeletingReference(ref); }} style={{...styles.iconButton, color: 'var(--error-color)', width: '28px', height: '28px', padding: '4px'}} title="Eliminar">{ICONS.delete}</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    )}
                </div>
            ) : (
                 <div style={{textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-light)', border: '2px dashed var(--border-color)', borderRadius: '16px'}}>
                     <p>No se encontraron referencias.</p>
                 </div>
            )}

            <button 
                onClick={() => { setEditingReference(null); setFormModalOpen(true); }}
                style={{
                    position: 'fixed', 
                    bottom: '2rem', 
                    right: '2rem', 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '50%', 
                    backgroundColor: 'var(--primary-color)', 
                    color: 'white', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '1.5rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                    zIndex: 1040,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                }}
                className="nav-item-hover"
                aria-label="Agregar nueva referencia"
            >
                {ICONS.add}
            </button>
        </div>
    );
};

export default ClinicalReferences;
