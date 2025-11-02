import React, { FC, useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { ClinicalReference, ClinicalReferenceContentItem } from '../../types';
import { useClinic } from '../../contexts/ClinicContext';

interface ReferenceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    referenceToEdit: ClinicalReference | null;
}

const modalRoot = document.getElementById('modal-root');

// A curated list of icons for user selection
const availableIcons = [
    { name: 'Diabetes', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>' },
    { name: 'Renal', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10c0-2.3-1.2-4.8-2-6-1-1.5-2-3-2-3s-1 1.5-2 3c-.8 1.2-2 3.7-2 6a10 10 0 0 0 10 10z"></path></svg>' },
    { name: 'Cardiología', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>' },
    { name: 'Presión', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>' },
    { name: 'Diagnóstico', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>' },
    { name: 'General', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>'},
    { name: 'Info', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'},
];

const toolLinks = [
    { key: '', label: 'Ninguna' },
    { key: 'energia', label: 'Requerimientos Energéticos' },
    { key: 'antropometria', label: 'Antropometría y Riesgo' },
    { key: 'renal', label: 'Función Renal' },
    { key: 'diabetes', label: 'Diabetes' },
    { key: 'poblaciones', label: 'Poblaciones Específicas' },
    { key: 'soporte', label: 'Soporte Nutricional' },
    { key: 'tamizaje', label: 'Tamizaje' },
    { key: 'pediatria', label: 'Pediatría' },
];

const ReferenceFormModal: FC<ReferenceFormModalProps> = ({ isOpen, onClose, onSave, referenceToEdit }) => {
    const { clinic } = useClinic();
    const [formData, setFormData] = useState({
        title: '', category: '', source: '', icon_svg: availableIcons[0].svg, linked_tool: ''
    });
    const [contentItems, setContentItems] = useState<Omit<ClinicalReferenceContentItem, 'key' | 'check' | 'threshold'>[]>([{ label: '', value: '' }]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (referenceToEdit) {
            setFormData({
                title: referenceToEdit.title || '',
                category: referenceToEdit.category || '',
                source: referenceToEdit.source || '',
                icon_svg: referenceToEdit.icon_svg || availableIcons[0].svg,
                linked_tool: referenceToEdit.linked_tool || '',
            });
            const editableContent = Array.isArray(referenceToEdit.content)
                ? referenceToEdit.content.map(c => ({ label: c.label, value: c.value }))
                : [{ label: '', value: '' }];
            setContentItems(editableContent);
        } else {
            setFormData({ title: '', category: '', source: '', icon_svg: availableIcons[0].svg, linked_tool: '' });
            setContentItems([{ label: '', value: '' }]);
        }
    }, [referenceToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleContentChange = (index: number, field: 'label' | 'value', value: string) => {
        const newItems = [...contentItems];
        newItems[index][field] = value;
        setContentItems(newItems);
    };

    const addContentItem = () => setContentItems([...contentItems, { label: '', value: '' }]);
    const removeContentItem = (index: number) => {
        if (contentItems.length > 1) {
            setContentItems(contentItems.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!clinic) { setError("No se pudo identificar la clínica."); return; }
        setLoading(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated.");

            const payload = {
                ...formData,
                linked_tool: formData.linked_tool || null,
                content: contentItems.filter(item => item.label && item.value), // Filter out empty items
                clinic_id: clinic.id,
                user_id: user.id,
            };

            if (referenceToEdit) {
                const { error: dbError } = await supabase.from('clinical_references').update(payload).eq('id', referenceToEdit.id);
                if (dbError) throw dbError;
            } else {
                const { error: dbError } = await supabase.from('clinical_references').insert(payload);
                if (dbError) throw dbError;
            }
            onSave();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '700px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>{referenceToEdit ? 'Editar Referencia' : 'Nueva Referencia Clínica'}</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    
                    <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem'}}>
                        <div><label>Título*</label><input name="title" value={formData.title} onChange={handleChange} required /></div>
                        <div><label>Categoría*</label><input name="category" value={formData.category} onChange={handleChange} required /></div>
                    </div>
                    
                    <label>Ícono</label>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px'}}>
                        {availableIcons.map(icon => (
                            <button
                                type="button"
                                key={icon.name}
                                onClick={() => setFormData(p => ({...p, icon_svg: icon.svg}))}
                                style={{
                                    padding: '0.5rem',
                                    border: `2px solid ${formData.icon_svg === icon.svg ? 'var(--primary-color)' : 'transparent'}`,
                                    background: 'var(--surface-color)',
                                    borderRadius: '8px',
                                    color: 'var(--primary-color)',
                                    cursor: 'pointer'
                                }}
                                title={icon.name}
                                dangerouslySetInnerHTML={{ __html: icon.svg }}
                            />
                        ))}
                    </div>

                    <label style={{marginTop: '1rem'}}>Criterios de Referencia</label>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                        {contentItems.map((item, index) => (
                            <div key={index} style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                                <input type="text" placeholder="Etiqueta (Ej. HbA1c)" value={item.label} onChange={e => handleContentChange(index, 'label', e.target.value)} style={{flex: 1, margin: 0}} />
                                <input type="text" placeholder="Valor (Ej. ≥ 6.5%)" value={item.value} onChange={e => handleContentChange(index, 'value', e.target.value)} style={{flex: 1, margin: 0}}/>
                                <button type="button" onClick={() => removeContentItem(index)} disabled={contentItems.length <= 1} style={{...styles.iconButton, color: 'var(--error-color)', border: 'none'}}>&times;</button>
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={addContentItem} className="button-secondary" style={{marginTop: '0.5rem'}}>+ Agregar Criterio</button>

                     <label style={{marginTop: '1rem'}}>Fuente (Opcional)</label>
                     <input name="source" value={formData.source} onChange={handleChange} placeholder="Ej: ADA 2025, Guía ESC 2023" />

                    <label style={{marginTop: '1rem'}}>Herramienta Vinculada (Opcional)</label>
                    <select name="linked_tool" value={formData.linked_tool} onChange={handleChange}>
                        {toolLinks.map(tool => (
                            <option key={tool.key} value={tool.key}>{tool.label}</option>
                        ))}
                    </select>

                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary">Cancelar</button>
                    <button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Referencia'}</button>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

export default ReferenceFormModal;