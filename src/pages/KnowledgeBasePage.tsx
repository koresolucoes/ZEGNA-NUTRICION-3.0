
import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { KnowledgeResource, PlanTemplate, FoodEquivalent } from '../types';
import ConfirmationModal from '../components/shared/ConfirmationModal';
import ResourceFormModal from '../components/knowledge_base/ResourceFormModal';
import PlanTemplateFormModal from '../components/knowledge_base/PlanTemplateFormModal';
import { useClinic } from '../contexts/ClinicContext';
import AiRecipeGeneratorModal from '../components/knowledge_base/AiRecipeGeneratorModal';
import SkeletonLoader from '../components/shared/SkeletonLoader';

const KnowledgeBasePage: FC<{ user: User; isMobile: boolean; }> = ({ user, isMobile }) => {
    const { clinic } = useClinic();
    const [activeTab, setActiveTab] = useState('resources');
    
    // Data
    const [resources, setResources] = useState<KnowledgeResource[]>([]);
    const [templates, setTemplates] = useState<PlanTemplate[]>([]);
    const [equivalents, setEquivalents] = useState<FoodEquivalent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        action: 'deleteResource' | 'deleteTemplate' | null;
        idToDelete: string | null;
        text: string | null;
    }>({ isOpen: false, action: null, idToDelete: null, text: null });

    const [editingResource, setEditingResource] = useState<KnowledgeResource | null>(null);
    const [isResourceModalOpen, setResourceModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<PlanTemplate | null>(null);
    const [isTemplateModalOpen, setTemplateModalOpen] = useState(false);
    const [isAiRecipeModalOpen, setAiRecipeModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        if (!clinic) return;
        setLoading(true);
        setError(null);
        try {
            const [resourcesRes, templatesRes, equivalentsRes] = await Promise.all([
                supabase.from('knowledge_base_resources').select('*').eq('clinic_id', clinic.id).order('created_at', { ascending: false }),
                supabase.from('plan_templates').select('*').eq('clinic_id', clinic.id).order('created_at', { ascending: false }),
                supabase.from('food_equivalents').select('*').or(`user_id.eq.${user.id},user_id.is.null`).order('group_name').order('subgroup_name')
            ]);

            const errors = [resourcesRes.error, templatesRes.error, equivalentsRes.error];
            const firstError = errors.find(Boolean);
            if (firstError) throw firstError;

            setResources(resourcesRes.data || []);
            setTemplates(templatesRes.data || []);
            setEquivalents(equivalentsRes.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [clinic, user.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!clinic) return;

        const handleRealtimeChange = (payload: any) => {
            console.log('Realtime change received for knowledge base, refetching data:', payload);
            fetchData();
        };

        const channel = supabase.channel('knowledge-base-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'knowledge_base_resources', filter: `clinic_id=eq.${clinic.id}` }, handleRealtimeChange)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_templates', filter: `clinic_id=eq.${clinic.id}` }, handleRealtimeChange)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [clinic, fetchData]);

    const handleFormClose = () => {
        setResourceModalOpen(false);
        setEditingResource(null);
        setTemplateModalOpen(false);
        setEditingTemplate(null);
        setAiRecipeModalOpen(false);
        fetchData(); 
    };

    const handleEditResource = (resource: KnowledgeResource) => {
        setEditingResource(resource);
        setResourceModalOpen(true);
    };

    const handleEditTemplate = (template: PlanTemplate) => {
        setEditingTemplate(template);
        setTemplateModalOpen(true);
    };

    const executeDelete = async () => {
        if (!modalState.action || !modalState.idToDelete) return;
        
        if (modalState.action === 'deleteResource') {
            const resourceToDelete = resources.find(r => r.id === modalState.idToDelete);
            const { error: dbError } = await supabase.from('knowledge_base_resources').delete().eq('id', modalState.idToDelete);
            if (dbError) throw dbError;

            if (resourceToDelete?.file_url) {
                try {
                    const url = new URL(resourceToDelete.file_url);
                    const filePath = decodeURIComponent(url.pathname.split('/files/')[1]);
                    await supabase.storage.from('files').remove([filePath]);
                } catch (e) { console.warn("Error deleting file from storage", e); }
            }
        } else if (modalState.action === 'deleteTemplate') {
            const { error: dbError } = await supabase.from('plan_templates').delete().eq('id', modalState.idToDelete);
            if (dbError) throw dbError;
        }
    };

    const openModal = (action: 'deleteResource' | 'deleteTemplate', id: string, text: string) => {
        setModalState({ isOpen: true, action, idToDelete: id, text });
    }
    const closeModal = () => setModalState({ isOpen: false, action: null, idToDelete: null, text: null });
    
    const handleConfirm = async () => {
        await executeDelete();
        closeModal();
        fetchData();
    };
    
    // Filtered Data
    const filteredResources = useMemo(() => {
        return resources.filter(r => r.title.toLowerCase().includes(searchTerm.toLowerCase()) || r.type.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [resources, searchTerm]);

    const filteredTemplates = useMemo(() => {
        return templates.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.type.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [templates, searchTerm]);

    // --- Styles ---
    const cardStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-color)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        position: 'relative',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        height: '100%',
        justifyContent: 'space-between'
    };

    const badgeStyle = (type: string): React.CSSProperties => {
        const base = {
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.5px',
        };
        
        switch(type.toLowerCase()) {
            case 'receta': return { ...base, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.2)' };
            case 'artículo': return { ...base, backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', border: '1px solid rgba(59, 130, 246, 0.2)' };
            case 'ejercicio': return { ...base, backgroundColor: 'rgba(249, 115, 22, 0.1)', color: '#F97316', border: '1px solid rgba(249, 115, 22, 0.2)' };
            default: return { ...base, backgroundColor: 'var(--surface-hover-color)', color: 'var(--text-light)', border: '1px solid var(--border-color)' };
        }
    };

    const TabButton = ({ id, label }: { id: string, label: string }) => (
        <button
            onClick={() => setActiveTab(id)}
            style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '50px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.95rem',
                backgroundColor: activeTab === id ? 'var(--primary-color)' : 'var(--surface-hover-color)',
                color: activeTab === id ? '#ffffff' : 'var(--text-light)',
                transition: 'all 0.2s',
                boxShadow: activeTab === id ? '0 4px 12px rgba(56, 189, 248, 0.3)' : 'none',
            }}
        >
            {label}
        </button>
    );

    return (
        <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
            <ConfirmationModal isOpen={modalState.isOpen} onClose={closeModal} onConfirm={handleConfirm} title="Confirmar Eliminación" message={<p>{modalState.text}</p>} />
            {isResourceModalOpen && <ResourceFormModal isOpen={isResourceModalOpen} onClose={handleFormClose} user={user} resourceToEdit={editingResource} />}
            {isTemplateModalOpen && <PlanTemplateFormModal isOpen={isTemplateModalOpen} onClose={handleFormClose} user={user} templateToEdit={editingTemplate} />}
            {isAiRecipeModalOpen && <AiRecipeGeneratorModal isOpen={isAiRecipeModalOpen} onClose={handleFormClose} equivalents={equivalents} />}

            {/* Header */}
            <div style={{...styles.pageHeader, marginBottom: '2rem', alignItems: 'flex-start'}}>
                <div>
                    <h1 style={{margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px'}}>Biblioteca</h1>
                    <p style={{margin: 0, color: 'var(--text-light)', maxWidth: '600px'}}>
                        Centraliza tus recursos y plantillas para agilizar tu trabajo y potenciar a tu asistente de IA.
                    </p>
                </div>
                <div style={{display: 'flex', gap: '0.75rem', flexWrap: 'wrap'}}>
                     <button onClick={() => setAiRecipeModalOpen(true)} className="button-secondary" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.2rem', borderRadius: '12px'}}>
                        <span style={{color: '#eab308'}}>{ICONS.sparkles}</span> Receta IA
                    </button>
                    <button onClick={() => { activeTab === 'resources' ? setResourceModalOpen(true) : setTemplateModalOpen(true); }} className="button-primary" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.2rem', borderRadius: '12px'}}>
                        {ICONS.add} Nuevo {activeTab === 'resources' ? 'Recurso' : 'Plantilla'}
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div style={{display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: '1.5rem', marginBottom: '2rem'}}>
                <div style={{display: 'flex', gap: '0.75rem'}}>
                    <TabButton id="resources" label="Recursos" />
                    <TabButton id="templates" label="Plantillas" />
                </div>

                <div style={{...styles.searchInputContainer, maxWidth: isMobile ? '100%' : '350px'}}>
                    <span style={styles.searchInputIcon}>🔍</span>
                    <input 
                        type="text" 
                        placeholder={`Buscar ${activeTab === 'resources' ? 'recursos' : 'plantillas'}...`}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{...styles.searchInput, backgroundColor: 'var(--surface-color)', borderRadius: '12px', borderColor: 'var(--border-color)', paddingLeft: '2.5rem'}} 
                    />
                </div>
            </div>
            
            {/* Content */}
            {loading ? <SkeletonLoader type="card" count={6} /> : error ? <p style={styles.error}>{error}</p> : (
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem'}}>
                    
                    {activeTab === 'resources' && (
                        filteredResources.length > 0 ? filteredResources.map(r => (
                            <div key={r.id} className="card-hover" style={cardStyle}>
                                <div>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem'}}>
                                        <span style={badgeStyle(r.type)}>{r.type}</span>
                                        <div style={{display: 'flex', gap: '0.25rem'}}>
                                            <button onClick={() => handleEditResource(r)} style={{...styles.iconButton, padding: '4px'}} title="Editar">{ICONS.edit}</button>
                                            <button onClick={() => openModal('deleteResource', r.id, `¿Eliminar "${r.title}"?`)} style={{...styles.iconButton, color: 'var(--error-color)', padding: '4px'}} title="Eliminar">{ICONS.delete}</button>
                                        </div>
                                    </div>
                                    <h3 style={{margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-color)'}}>{r.title}</h3>
                                    <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--text-light)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>
                                        {r.content || 'Sin contenido de texto.'}
                                    </p>
                                </div>
                                
                                <div style={{paddingTop: '1rem', borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    {r.file_url ? (
                                         <a href={r.file_url} target="_blank" rel="noopener noreferrer" style={{...styles.link, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem'}}>
                                            {ICONS.file} <span>Ver Archivo</span>
                                        </a>
                                    ) : <span style={{fontSize: '0.8rem', color: 'var(--text-light)', fontStyle: 'italic'}}>Solo texto</span>}
                                    <span style={{fontSize: '0.75rem', color: 'var(--text-light)'}}>{new Date(r.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        )) : (
                            <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', border: '2px dashed var(--border-color)', borderRadius: '16px', color: 'var(--text-light)'}}>
                                <p>No se encontraron recursos.</p>
                                <button onClick={() => setResourceModalOpen(true)} style={{background: 'none', border: 'none', color: 'var(--primary-color)', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem'}}>Crear el primero</button>
                            </div>
                        )
                    )}

                    {activeTab === 'templates' && (
                         filteredTemplates.length > 0 ? filteredTemplates.map(t => (
                            <div key={t.id} className="card-hover" style={cardStyle}>
                                <div>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem'}}>
                                        <span style={badgeStyle(t.type)}>{t.type}</span>
                                        <div style={{display: 'flex', gap: '0.25rem'}}>
                                            <button onClick={() => handleEditTemplate(t)} style={{...styles.iconButton, padding: '4px'}} title="Editar">{ICONS.edit}</button>
                                            <button onClick={() => openModal('deleteTemplate', t.id, `¿Eliminar "${t.title}"?`)} style={{...styles.iconButton, color: 'var(--error-color)', padding: '4px'}} title="Eliminar">{ICONS.delete}</button>
                                        </div>
                                    </div>
                                    <h3 style={{margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-color)'}}>{t.title}</h3>
                                    <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--text-light)'}}>
                                        {t.description || 'Sin descripción'}
                                    </p>
                                </div>
                                <div style={{paddingTop: '1rem', borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center'}}>
                                     <span style={{fontSize: '0.75rem', color: 'var(--text-light)'}}>{new Date(t.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        )) : (
                             <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', border: '2px dashed var(--border-color)', borderRadius: '16px', color: 'var(--text-light)'}}>
                                <p>No se encontraron plantillas.</p>
                                <button onClick={() => setTemplateModalOpen(true)} style={{background: 'none', border: 'none', color: 'var(--primary-color)', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem'}}>Crear la primera</button>
                            </div>
                        )
                    )}

                </div>
            )}
        </div>
    );
}

export default KnowledgeBasePage;
