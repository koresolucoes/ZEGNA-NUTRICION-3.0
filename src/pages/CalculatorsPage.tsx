import React, { FC, useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { FoodEquivalent, Person, DietPlanHistoryItem, ClinicalReference, ConsultationWithLabs, KnowledgeResource } from '../types';
import DietPlanner from '../components/calculators/DietPlanner';
import QuickTools from '../components/calculators/QuickTools';
import ClinicalReferences from '../components/calculators/ClinicalReferences';
import EquivalentsTableManager from '../components/calculators/EquivalentsTableManager';
import PlanHistory from '../components/calculators/PlanHistory';
import { useClinic } from '../contexts/ClinicContext';

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
            setPersons(personsRes.data || []);
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
        const person = persons.find(p => p.id === selectedPersonId);
        setSearchTerm(person?.full_name || '');
    }, [selectedPersonId, persons]);

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
        if (selectedPersonId && searchTerm === persons.find(p => p.id === selectedPersonId)?.full_name) {
            return persons;
        }
        return persons.filter(p => p.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [persons, searchTerm, selectedPersonId]);

    const patients = filteredPersons.filter(p => p.person_type === 'client');
    const affiliates = filteredPersons.filter(p => p.person_type === 'member');

    const handleSelectPerson = (person: Person | null) => {
        setSelectedPersonId(person ? person.id : '');
        setSearchTerm(person ? person.full_name : '');
        setIsDropdownOpen(false);
    };

    const handleSaveToLog = async (calculatorKey: string, logType: string, description: string, data: { inputs: any, result: any }) => {
        if (!selectedPerson) return;
        
        // This function is passed down to tool components
    };

    const renderContent = () => {
        if (loading) return <p>Cargando herramientas...</p>;
        if (error) return <p style={styles.error}>{error}</p>;

        switch(activeTab) {
            case 'planner':
                return <DietPlanner 
                            equivalentsData={equivalents} 
                            persons={persons}
                            knowledgeResources={knowledgeResources}
                            isMobile={isMobile} 
                            onPlanSaved={fetchData}
                            initialPlan={planToLoad}
                            clearInitialPlan={() => setPlanToLoad(null)}
                        />;
            case 'tools':
                return <QuickTools 
                            selectedPerson={selectedPerson}
                            lastConsultation={lastConsultation}
                            activeSubTab={activeToolSubTab}
                            setActiveSubTab={setActiveToolSubTab}
                            handleSaveToLog={handleSaveToLog}
                            saveStatus={{}}
                        />;
            case 'references':
                return <ClinicalReferences 
                            references={clinicalReferences}
                            selectedPerson={selectedPerson}
                            lastConsultation={lastConsultation}
                            onNavigateToToolTab={(mainTab, subTab) => {
                                setActiveTab(mainTab);
                                if (subTab) setActiveToolSubTab(subTab);
                            }}
                            onDataRefresh={fetchData}
                        />;
            case 'manage':
                return <EquivalentsTableManager equivalents={equivalents} onDataChange={fetchData} />;
            case 'history':
                return <PlanHistory 
                            history={planHistory} 
                            onLoadPlan={handleLoadPlan} 
                            onDeletePlan={handleDeletePlan} 
                        />;
            default:
                return null;
        }
    }

    return (
        <div className="fade-in">
            <div style={styles.pageHeader}>
                <h1>Herramientas</h1>
            </div>
            <p style={{marginTop: '-1.5rem', color: 'var(--text-light)', maxWidth: '800px'}}>
                Utiliza estas herramientas para agilizar la creación de planes alimenticios y obtener datos clínicos para tus pacientes.
            </p>

             <nav className="tabs" style={{marginTop: '1.5rem'}}>
                <button className={`tab-button ${activeTab === 'references' ? 'active' : ''}`} onClick={() => setActiveTab('references')}>Referencias Clínicas</button>
                <button className={`tab-button ${activeTab === 'tools' ? 'active' : ''}`} onClick={() => setActiveTab('tools')}>Herramientas Clínicas</button>
                <button className={`tab-button ${activeTab === 'manage' ? 'active' : ''}`} onClick={() => setActiveTab('manage')}>Gestionar Equivalentes</button>
                <button className={`tab-button ${activeTab === 'planner' ? 'active' : ''}`} onClick={() => setActiveTab('planner')}>Planificador Dietético</button>
                <button className={`tab-button ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Historial de Planes</button>
            </nav>

            {(activeTab === 'references' || activeTab === 'tools') && (
                 <div ref={containerRef} style={{marginTop: '2rem', marginBottom: '2rem', maxWidth: '400px', backgroundColor: 'var(--surface-color)', padding: '1rem', borderRadius: '8px', position: 'relative'}}>
                    <label htmlFor="person-search">Asociar Cálculos a:</label>
                    <div style={{ position: 'relative' }}>
                        <input 
                            id="person-search"
                            type="text"
                            placeholder="Buscar y seleccionar..."
                            value={searchTerm}
                            onChange={e => {
                                setSearchTerm(e.target.value);
                                if (selectedPersonId) setSelectedPersonId('');
                                setIsDropdownOpen(true);
                            }}
                            onFocus={() => setIsDropdownOpen(true)}
                            style={{ marginBottom: 0, paddingRight: '2.5rem' }}
                            autoComplete="off"
                        />
                         <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-light)', transition: 'transform 0.2s', ...(isDropdownOpen && { transform: 'translateY(-50%) rotate(180deg)' }) }}>
                            ▼
                        </div>
                    </div>

                    {isDropdownOpen && (
                        <div style={{ position: 'absolute', top: '100%', left: '1rem', right: '1rem', backgroundColor: 'var(--surface-hover-color)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '0.5rem', maxHeight: '300px', overflowY: 'auto', zIndex: 10 }}>
                            {(patients.length > 0 || affiliates.length > 0) ? (
                                <>
                                    {patients.length > 0 && (
                                        <>
                                            <div style={{padding: '0.5rem 1rem', fontWeight: 600, color: 'var(--text-light)', fontSize: '0.8rem', borderBottom: '1px solid var(--border-color)'}}>Pacientes</div>
                                            {patients.map(p => (
                                                <div key={p.id} onClick={() => handleSelectPerson(p)} style={{padding: '0.75rem 1rem', cursor: 'pointer'}} className="nav-item-hover">
                                                    {p.full_name}
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    {affiliates.length > 0 && (
                                        <>
                                            <div style={{padding: '0.5rem 1rem', fontWeight: 600, color: 'var(--text-light)', fontSize: '0.8rem', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)'}}>Afiliados</div>
                                            {affiliates.map(p => (
                                                <div key={p.id} onClick={() => handleSelectPerson(p)} style={{padding: '0.75rem 1rem', cursor: 'pointer'}} className="nav-item-hover">
                                                    {p.full_name}
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </>
                            ) : (
                                 <div style={{padding: '1rem', color: 'var(--text-light)'}}>No se encontraron resultados.</div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div style={{marginTop: (activeTab !== 'references' && activeTab !== 'tools') ? '2rem' : 0}}>
                {renderContent()}
            </div>
        </div>
    );
};

export default CalculatorsPage;