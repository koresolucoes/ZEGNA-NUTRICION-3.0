
import React, { FC, useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { FoodEquivalent, Person, DietPlanHistoryItem, ClinicalReference, ConsultationWithLabs, KnowledgeResource } from '../types';
import DietPlanner from '../components/calculators/DietPlanner';
import QuickTools from '../components/calculators/QuickTools';
import ClinicalReferences from '../components/calculators/ClinicalReferences';
import EquivalentsTableManager from '../components/calculators/EquivalentsTableManager';
import PlanHistory from '../components/calculators/PlanHistory';
import { useClinic } from '../contexts/ClinicContext';
import SkeletonLoader from '../components/shared/SkeletonLoader';

interface CalculatorsPageProps {
    isMobile: boolean;
    initialPlanToLoad?: DietPlanHistoryItem | null;
    initialPersonToLoad?: Person | null;
}

const CalculatorsPage: FC<CalculatorsPageProps> = ({ isMobile, initialPlanToLoad, initialPersonToLoad }) => {
    const { clinic } = useClinic();
    const [activeTab, setActiveTab] = useState(initialPlanToLoad ? 'planner' : 'references');
    const [activeToolSubTab, setActiveToolSubTab] = useState('energia');
    
    // State for data fetched once
    const [equivalents, setEquivalents] = useState<FoodEquivalent[]>([]);
    const [planHistory, setPlanHistory] = useState<DietPlanHistoryItem[]>([]);
    const [persons, setPersons] = useState<Person[]>([]);
    const [clinicalReferences, setClinicalReferences] = useState<ClinicalReference[]>([]);
    const [knowledgeResources, setKnowledgeResources] = useState<KnowledgeResource[]>([]);

    // Lifted state for shared context between tools and references
    const [selectedPersonId, setSelectedPersonId] = useState('');
    const [lastConsultation, setLastConsultation] = useState<ConsultationWithLabs | null>(null);

    const [planToLoad, setPlanToLoad] = useState<DietPlanHistoryItem | null>(initialPlanToLoad || null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for shared patient selector
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const fetchData = async () => {
        if (!clinic) return;
        setLoading(true);
        setError(null);
        try {
            const [equivalentsRes, historyRes, personsRes, referencesRes, resourcesRes] = await Promise.all([
                supabase.from('food_equivalents').select('*'),
                supabase.from('diet_plan_history').select('*').eq('clinic_id', clinic.id).order('plan_date', { ascending: false }),
                supabase.from('persons').select('id, full_name, person_type, gender, birth_date').eq('clinic_id', clinic.id).order('full_name'),
                supabase.from('clinical_references').select('*').eq('clinic_id', clinic.id).order('category').order('title'),
                supabase.from('knowledge_base_resources').select('*').eq('clinic_id', clinic.id),
            ]);

            const errors = [equivalentsRes.error, historyRes.error, personsRes.error, referencesRes.error, resourcesRes.error];
            const firstError = errors.find(Boolean);
            if (firstError) throw firstError;

            setEquivalents(equivalentsRes.data || []);
            setPlanHistory(historyRes.data || []);
            setPersons(personsRes.data as unknown as Person[] || []);
            setClinicalReferences(referencesRes.data as ClinicalReference[] || []);
            setKnowledgeResources(resourcesRes.data || []);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [clinic]);

    useEffect(() => {
        if (initialPersonToLoad) {
            setSelectedPersonId(initialPersonToLoad.id);
            setSearchTerm(initialPersonToLoad.full_name);
        }
    }, [initialPersonToLoad]);

    useEffect(() => {
        const fetchLastConsultation = async () => {
            if (!selectedPersonId) {
                setLastConsultation(null);
                return;
            }
            const { data } = await supabase.from('consultations').select('*, lab_results(*)').eq('person_id', selectedPersonId).order('consultation_date', { ascending: false }).limit(1).single();
            setLastConsultation(data as ConsultationWithLabs | null);
        };
        fetchLastConsultation();
    }, [selectedPersonId]);

    useEffect(() => {
        if (initialPlanToLoad) {
            setActiveTab('planner');
        }
    }, [initialPlanToLoad]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLoadPlan = (plan: DietPlanHistoryItem) => {
        setPlanToLoad(plan);
        setActiveTab('planner');
    };

    const handleDeletePlan = async (planId: string) => {
        try {
            const { error } = await supabase.from('diet_plan_history').delete().eq('id', planId);
            if (error) throw error;
            fetchData(); // Refresh list after deleting
        } catch (err: any) {
            setError(`Error al eliminar el plan: ${err.message}`);
        }
    };
    
    const selectedPerson = persons.find(p => p.id === selectedPersonId) || null;
    
    const filteredPersons = useMemo(() => {
        if (!searchTerm) return persons;
        // If search term matches the currently selected person's name exactly, show all (user hasn't started typing new search)
        if (selectedPerson && searchTerm === selectedPerson.full_name) {
            return persons;
        }
        return persons.filter(p => p.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [persons, searchTerm, selectedPerson]);

    const patients = filteredPersons.filter(p => p.person_type === 'client');
    const affiliates = filteredPersons.filter(p => p.person_type === 'member');

    const handleSelectPerson = (person: Person | null) => {
        setSelectedPersonId(person ? person.id : '');
        setSearchTerm(person ? person.full_name : '');
        setIsDropdownOpen(false);
    };

    const handleSaveToLog = async (calculatorKey: string, logType: string, description: string, data: { inputs: any, result: any }) => {
        if (!selectedPerson) {
             alert("Debes seleccionar un paciente primero para guardar en su bitácora.");
             return;
        }
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
             await supabase.from('logs').insert({
                person_id: selectedPerson.id,
                log_type: logType,
                description: description,
                created_by_user_id: user?.id
            });
            alert("Registro guardado en la bitácora del paciente.");
        } catch (e) {
            console.error("Error saving to log:", e);
            alert("Error al guardar.");
        }
    };

    const renderContent = () => {
        if (loading) return <SkeletonLoader type="card" count={3} />;
        if (error) return <p style={styles.error}>{error}</p>;

        return (
            <div className="fade-in">
                {activeTab === 'planner' && (
                    <DietPlanner 
                        equivalentsData={equivalents} 
                        persons={persons}
                        knowledgeResources={knowledgeResources}
                        isMobile={isMobile} 
                        onPlanSaved={fetchData}
                        initialPlan={planToLoad}
                        clearInitialPlan={() => setPlanToLoad(null)}
                    />
                )}
                {activeTab === 'tools' && (
                    <QuickTools 
                        selectedPerson={selectedPerson}
                        lastConsultation={lastConsultation}
                        activeSubTab={activeToolSubTab}
                        setActiveSubTab={setActiveToolSubTab}
                        handleSaveToLog={handleSaveToLog}
                        saveStatus={{}}
                    />
                )}
                {activeTab === 'references' && (
                    <ClinicalReferences 
                        references={clinicalReferences}
                        selectedPerson={selectedPerson}
                        lastConsultation={lastConsultation}
                        onNavigateToToolTab={(mainTab, subTab) => {
                            setActiveTab(mainTab);
                            if (subTab) setActiveToolSubTab(subTab);
                        }}
                        onDataRefresh={fetchData}
                    />
                )}
                {activeTab === 'manage' && (
                    <EquivalentsTableManager equivalents={equivalents} onDataChange={fetchData} />
                )}
                {activeTab === 'history' && (
                    <PlanHistory 
                        history={planHistory} 
                        onLoadPlan={handleLoadPlan} 
                        onDeletePlan={handleDeletePlan} 
                    />
                )}
            </div>
        );
    }

    return (
        <div className="fade-in" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '4rem' }}>
            {/* Header */}
             <div style={{...styles.pageHeader, marginBottom: '2rem', alignItems: 'flex-start'}}>
                <div>
                    <h1 style={{margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px'}}>Herramientas Clínicas</h1>
                    <p style={{margin: 0, color: 'var(--text-light)', maxWidth: '700px'}}>
                        Conjunto de calculadoras, referencias y planificador dietético para optimizar tu consulta.
                    </p>
                </div>
            </div>

            {/* Patient Context Bar (Always visible above tabs) */}
            <div style={{ 
                backgroundColor: 'var(--surface-color)', 
                padding: '1rem 1.5rem', 
                borderRadius: '16px', 
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow)',
                marginBottom: '2rem',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: '1.5rem'
            }}>
                <div style={{ flex: 1 }} ref={containerRef}>
                    <label htmlFor="person-search" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                        Paciente Seleccionado
                    </label>
                    <div style={{ position: 'relative' }}>
                         <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-color)' }}>
                            {ICONS.user}
                        </div>
                        <input 
                            id="person-search"
                            type="text"
                            placeholder="Buscar paciente para calcular..."
                            value={searchTerm}
                            onChange={e => {
                                setSearchTerm(e.target.value);
                                if (selectedPersonId) setSelectedPersonId(''); 
                                setIsDropdownOpen(true);
                            }}
                            onFocus={() => setIsDropdownOpen(true)}
                            style={{ 
                                ...styles.input,
                                marginBottom: 0, 
                                paddingLeft: '3rem', 
                                backgroundColor: 'var(--surface-hover-color)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '12px',
                                fontWeight: 500
                            }}
                            autoComplete="off"
                        />
                        {selectedPersonId && (
                            <button 
                                onClick={() => { setSelectedPersonId(''); setSearchTerm(''); }}
                                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}
                            >
                                &times;
                            </button>
                        )}
                    </div>

                    {isDropdownOpen && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px', maxHeight: '300px', overflowY: 'auto', zIndex: 20, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
                             {(patients.length > 0 || affiliates.length > 0) ? (
                                <>
                                    {patients.length > 0 && (
                                        <>
                                            <div style={{padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--primary-color)', fontSize: '0.75rem', backgroundColor: 'var(--surface-hover-color)', textTransform: 'uppercase'}}>Pacientes</div>
                                            {patients.map(p => (
                                                <div key={p.id} onClick={() => handleSelectPerson(p)} style={{padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)'}} className="nav-item-hover">
                                                    {p.full_name}
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    {affiliates.length > 0 && (
                                        <>
                                            <div style={{padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--primary-color)', fontSize: '0.75rem', backgroundColor: 'var(--surface-hover-color)', textTransform: 'uppercase'}}>Afiliados</div>
                                            {affiliates.map(p => (
                                                <div key={p.id} onClick={() => handleSelectPerson(p)} style={{padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)'}} className="nav-item-hover">
                                                    {p.full_name}
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </>
                            ) : (
                                 <div style={{padding: '1rem', color: 'var(--text-light)', textAlign: 'center'}}>No se encontraron resultados.</div>
                            )}
                        </div>
                    )}
                </div>
                
                {selectedPerson && (
                    <div style={{ display: 'flex', gap: '2rem', paddingLeft: isMobile ? 0 : '2rem', borderLeft: isMobile ? 'none' : '1px solid var(--border-color)' }}>
                        <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 700 }}>Edad</span>
                            <p style={{ margin: 0, fontWeight: 600 }}>{selectedPerson.birth_date ? `${new Date().getFullYear() - new Date(selectedPerson.birth_date).getFullYear()} años` : '-'}</p>
                        </div>
                         <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 700 }}>Último Peso</span>
                            <p style={{ margin: 0, fontWeight: 600 }}>{lastConsultation?.weight_kg ? `${lastConsultation.weight_kg} kg` : '-'}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Navigation (Folder Tabs) */}
             <div style={styles.tabContainer}>
                {[
                    { id: 'references', label: 'Referencias', icon: ICONS.book },
                    { id: 'tools', label: 'Calculadoras', icon: ICONS.calculator },
                    { id: 'planner', label: 'Planificador', icon: ICONS.sparkles },
                    { id: 'history', label: 'Historial', icon: ICONS.clock },
                    { id: 'manage', label: 'Equivalentes', icon: ICONS.list }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={activeTab === tab.id ? {...styles.folderTab, ...styles.folderTabActive} : styles.folderTab}
                    >
                        <span style={{ marginRight: '0.5rem' }}>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Folder Content */}
            <div style={styles.folderContent}>
                {renderContent()}
            </div>
        </div>
    );
};

export default CalculatorsPage;
