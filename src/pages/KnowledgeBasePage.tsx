
import React, { FC, useState, useEffect, useCallback } from 'react';
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

const KnowledgeBasePage: FC<{ user: User; isMobile: boolean; }> = ({ user, isMobile }) => {
    const { clinic } = useClinic();
    const [activeTab, setActiveTab] = useState('resources');
    const [resources, setResources] = useState<KnowledgeResource[]>([]);
    const [templates, setTemplates] = useState<PlanTemplate[]>([]);
    const [equivalents, setEquivalents] = useState<FoodEquivalent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Realtime subscription started for KnowledgeBasePage.');
                }
                if (status === 'CLOSED') {
                    console.log('Realtime subscription closed for KnowledgeBasePage.');
                }
                if (status === 'CHANNEL_ERROR') {
                    console.error('Realtime subscription error on KnowledgeBasePage:', err);
                }
            });

        return () => {
            console.log('Cleaning up realtime subscription for KnowledgeBasePage.');
            supabase.removeChannel(channel);
        };
    }, [clinic, fetchData]);

    const handleFormClose = () => {
        setResourceModalOpen(false);
        setEditingResource(null);
        setTemplateModalOpen(false);
        setEditingTemplate(null);
        setAiRecipeModalOpen(false);
        fetchData(); // Always refetch on close to see changes
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
                const url = new URL(resourceToDelete.file_url);
                const filePath = decodeURIComponent(url.pathname.split('/files/')[1]);
                const { error: storageError } = await supabase.storage.from('files').remove([filePath]);
                if (storageError) console.warn("Failed to delete file from storage:", storageError.message);
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
        await executeDelete(); // Await deletion
        closeModal();
        fetchData(); // Manually refetch data for immediate UI update
    };

    const renderResources = () => (
        <div className="fade-in">
            <div style={{...styles.pageHeader, paddingBottom: '0.5rem', marginBottom: '1.5rem'}}>
                <h2 style={{margin:0}}>Recursos de Conocimiento</h2>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <button onClick={() => setAiRecipeModalOpen(true)} className="button-secondary">
                        {ICONS.sparkles} Generar Receta con IA
                    </button>
                    <button onClick={() => setResourceModalOpen(true)}>{ICONS.add} Nuevo Recurso</button>
                </div>
            </div>
            {resources.length > 0 ? (
                <div className="info-grid">
                    {resources.map(r => (
                        <div key={r.id} className="info-card">
                            <div style={{flex: 1}}>
                                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>{r.title}</h4>
                                <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 500, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', display: 'inline-block' }}>{r.type}</span>
                                {r.file_url && (
                                    <a href={r.file_url} target="_blank" rel="noopener noreferrer" style={{ ...styles.link, display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                                        {ICONS.file}
                                        <span>{decodeURIComponent(r.file_url.split('/').pop() || 'Ver Archivo')}</span>
                                    </a>
                                )}
                                <p style={{margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-light)'}}>
                                    Creado: {new Date(r.created_at).toLocaleDateString('es-MX')}
                                </p>
                            </div>
                            <div className="card-actions">
                                <button onClick={() => handleEditResource(r)} style={styles.iconButton} title="Editar">{ICONS.edit}</button>
                                <button onClick={() => openModal('deleteResource', r.id, `¿Eliminar el recurso "${r.title}"?`)} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar">{ICONS.delete}</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : <p>No hay recursos en tu biblioteca. ¡Añade uno para empezar a potenciar a tu agente de IA!</p>}
        </div>
    );

    const renderTemplates = () => (
         <div className="fade-in">
            <div style={{...styles.pageHeader, paddingBottom: '0.5rem', marginBottom: '1.5rem'}}>
                <h2 style={{margin:0}}>Plantillas de Planes</h2>
                <button onClick={() => setTemplateModalOpen(true)}>{ICONS.add} Nueva Plantilla</button>
            </div>
             {templates.length > 0 ? (
                <div className="info-grid">
                    {templates.map(t => (
                        <div key={t.id} className="info-card">
                            <div style={{flex: 1}}>
                                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>{t.title}</h4>
                                <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 500, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', display: 'inline-block' }}>{t.type}</span>
                                <p style={{margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)'}}>{t.description || 'Sin descripción'}</p>
                            </div>
                             <div className="card-actions">
                                <button onClick={() => handleEditTemplate(t)} style={styles.iconButton} title="Editar">{ICONS.edit}</button>
                                <button onClick={() => openModal('deleteTemplate', t.id, `¿Eliminar la plantilla "${t.title}"?`)} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar">{ICONS.delete}</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : <p>No tienes plantillas guardadas. Crea plantillas para agilizar la creación de planes para tus pacientes.</p>}
        </div>
    );

    return (
        <div className="fade-in">
            <ConfirmationModal isOpen={modalState.isOpen} onClose={closeModal} onConfirm={handleConfirm} title="Confirmar Eliminación" message={<p>{modalState.text}</p>} />
            {isResourceModalOpen && <ResourceFormModal isOpen={isResourceModalOpen} onClose={handleFormClose} user={user} resourceToEdit={editingResource} />}
            {isTemplateModalOpen && <PlanTemplateFormModal isOpen={isTemplateModalOpen} onClose={handleFormClose} user={user} templateToEdit={editingTemplate} />}
            {isAiRecipeModalOpen && <AiRecipeGeneratorModal isOpen={isAiRecipeModalOpen} onClose={handleFormClose} equivalents={equivalents} />}

            <div style={styles.pageHeader}>
                <h1>Biblioteca de Conocimiento</h1>
            </div>
            <p style={{marginTop: '-1.5rem', color: 'var(--text-light)', maxWidth: '800px'}}>
                Gestiona los recursos y plantillas que utiliza tu asistente de IA para ofrecer respuestas precisas y para agilizar tu flujo de trabajo.
            </p>

            <nav className="tabs" style={{marginTop: '1.5rem'}}>
                <button className={`tab-button ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveTab('resources')}>Recursos</button>
                <button className={`tab-button ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')}>Plantillas</button>
            </nav>
            
            {loading && <p>Cargando biblioteca...</p>}
            {error && <p style={styles.error}>{error}</p>}
            {!loading && !error && (
                <div>
                    {activeTab === 'resources' && renderResources()}
                    {activeTab === 'templates' && renderTemplates()}
                </div>
            )}
        </div>
    );
}

export default KnowledgeBasePage;
