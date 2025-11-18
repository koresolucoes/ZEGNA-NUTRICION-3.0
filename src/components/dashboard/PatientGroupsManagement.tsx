
import React, { FC, useState, useEffect, useCallback, FormEvent } from 'react';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { useClinic } from '../../contexts/ClinicContext';
import { PopulatedPatientGroup, Person, PatientServicePlan, SharedSubscription } from '../../types';
import ConfirmationModal from '../shared/ConfirmationModal';

// --- MODAL PARA CREAR/EDITAR GRUPO ---
const PatientGroupFormModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    groupToEdit: PopulatedPatientGroup | null;
    allPersons: Person[];
}> = ({ isOpen, onClose, onSave, groupToEdit, allPersons }) => {
    const { clinic } = useClinic();
    const [name, setName] = useState('');
    const [selectedPersonIds, setSelectedPersonIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (groupToEdit) {
            setName(groupToEdit.name);
            // Explicitly cast mapped IDs to string[] to satisfy Set constructor
            const persons = (groupToEdit.persons || []) as any[];
            const ids = persons.map(p => String(p.id));
            setSelectedPersonIds(new Set(ids));
        } else {
            setName('');
            setSelectedPersonIds(new Set());
        }
    }, [groupToEdit]);

    const handleTogglePerson = (personId: string) => {
        setSelectedPersonIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(personId)) {
                newSet.delete(personId);
            } else {
                newSet.add(personId);
            }
            return newSet;
        });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!clinic || !name.trim()) return;
        setLoading(true);
        setError(null);
        try {
            // 1. Upsert group
            const { data: groupData, error: groupError } = await supabase
                .from('patient_groups')
                .upsert({ id: groupToEdit?.id, name, clinic_id: clinic.id })
                .select()
                .single();
            if (groupError) throw groupError;

            // 2. Determine who to add and who to remove
            // FIX: Use Array.from on Set to avoid type errors and cast to any to access properties
            const currentGroupPersons = (groupToEdit?.persons || []) as any[];
            const originalMemberIds = new Set(currentGroupPersons.map(p => String(p.id)));
            
            // Calculate additions and removals
            const idsToAdd: string[] = [];
            const idsToRemove: string[] = [];

            selectedPersonIds.forEach(id => {
                if (!originalMemberIds.has(id)) idsToAdd.push(id);
            });
            
            originalMemberIds.forEach(id => {
                if (!selectedPersonIds.has(id)) idsToRemove.push(id);
            });

            // 3. Update persons table
            if (idsToRemove.length > 0) {
                const { error: removeError } = await supabase
                    .from('persons')
                    .update({ patient_group_id: null })
                    .in('id', idsToRemove);
                if (removeError) throw removeError;
            }
            if (idsToAdd.length > 0) {
                const { error: addError } = await supabase
                    .from('persons')
                    .update({ patient_group_id: groupData.id })
                    .in('id', idsToAdd);
                if (addError) throw addError;
            }
            onSave();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={{ ...styles.modalContent, maxWidth: '600px' }}>
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>{groupToEdit ? 'Editar Grupo' : 'Nuevo Grupo'}</h2>
                    <button type="button" onClick={onClose} style={{ ...styles.iconButton, border: 'none' }}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    <label>Nombre del Grupo</label>
                    <input value={name} onChange={e => setName(e.target.value)} required />

                    <label style={{ marginTop: '1rem' }}>Miembros del Grupo</label>
                    <div style={{ maxHeight: '30vh', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        {allPersons.map(person => (
                            <div key={person.id} onClick={() => handleTogglePerson(person.id)} style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} className="nav-item-hover">
                                <input type="checkbox" checked={selectedPersonIds.has(person.id)} readOnly style={{ width: '18px', height: '18px' }} />
                                <span>{person.full_name}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary">Cancelar</button>
                    <button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Grupo'}</button>
                </div>
            </form>
        </div>
    );
};

// --- MODAL PARA ASIGNAR PLAN COMPARTIDO ---
const SharedSubscriptionFormModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    group: PopulatedPatientGroup;
    servicePlans: PatientServicePlan[];
}> = ({ isOpen, onClose, onSave, group, servicePlans }) => {
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setSelectedPlanId(group.shared_subscriptions?.[0]?.plan_id || '');
    }, [group]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const plan = servicePlans.find(p => p.id === selectedPlanId);
            if (!plan) throw new Error("Plan no seleccionado o no encontrado.");

            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(startDate.getDate() + plan.duration_days);

            const payload = {
                group_id: group.id,
                plan_id: selectedPlanId,
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
            };

            const { error } = await supabase.from('shared_subscriptions').upsert(payload, { onConflict: 'group_id' });
            if (error) {
                if (error.message.includes('ON CONFLICT')) {
                    throw new Error("Error de base de datos: Falta una restricción 'UNIQUE' en la tabla de suscripciones. Por favor, ejecuta el último script de migración SQL desde el archivo supabase.ts para solucionar el problema.");
                }
                throw error;
            }
            onSave();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={{ ...styles.modalContent, maxWidth: '500px' }}>
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Asignar Plan a "{group.name}"</h2>
                    <button type="button" onClick={onClose} style={{ ...styles.iconButton, border: 'none' }}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    <label>Seleccionar Plan de Servicio</label>
                    <select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)} required>
                        <option value="" disabled>-- Elige un plan --</option>
                        {servicePlans.map(plan => (
                            <option key={plan.id} value={plan.id}>
                                {plan.name} ({plan.duration_days} días, {plan.max_consultations || '∞'} consultas)
                            </option>
                        ))}
                    </select>
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary">Cancelar</button>
                    <button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Asignar Plan'}</button>
                </div>
            </form>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
const PatientGroupsManagement: FC = () => {
    const { clinic } = useClinic();
    const [groups, setGroups] = useState<PopulatedPatientGroup[]>([]);
    const [allPersons, setAllPersons] = useState<Person[]>([]);
    const [servicePlans, setServicePlans] = useState<PatientServicePlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [modal, setModal] = useState<{ type: 'deleteGroup' | 'removeMember' | 'form' | 'subscription' | null, data: any, isOpen: boolean }>({ type: null, data: null, isOpen: false });

    const fetchData = useCallback(async () => {
        if (!clinic) return;
        setLoading(true);
        setError(null);
        try {
            const [groupsRes, personsRes, plansRes] = await Promise.all([
                supabase.from('patient_groups').select('*, persons(id, full_name), shared_subscriptions(*, patient_service_plans(*))').eq('clinic_id', clinic.id),
                supabase.from('persons').select('*').eq('clinic_id', clinic.id),
                supabase.from('patient_service_plans').select('*').eq('clinic_id', clinic.id)
            ]);
            
            if (groupsRes.error) throw groupsRes.error;
            if (personsRes.error) throw personsRes.error;
            if (plansRes.error) throw plansRes.error;

            setGroups(groupsRes.data as unknown as PopulatedPatientGroup[] || []);
            setAllPersons(personsRes.data || []);
            setServicePlans(plansRes.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [clinic]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleConfirmDelete = async () => {
        if (!modal.data) return;
        setLoading(true);
        if (modal.type === 'deleteGroup') {
            const { error } = await supabase.from('patient_groups').delete().eq('id', modal.data.id);
            if (error) setError(error.message);
        } else if (modal.type === 'removeMember') {
            const { error } = await supabase.from('persons').update({ patient_group_id: null }).eq('id', modal.data.personId);
            if (error) setError(error.message);
        }
        setModal({ type: null, data: null, isOpen: false });
        fetchData(); // Refetch all data after action
    };

    return (
        <div className="fade-in" style={{ maxWidth: '900px' }}>
            {modal.isOpen && modal.type === 'deleteGroup' && (
                <ConfirmationModal
                    isOpen={modal.isOpen}
                    onClose={() => setModal({ type: null, data: null, isOpen: false })}
                    onConfirm={handleConfirmDelete}
                    title="Confirmar Eliminación"
                    message={<p>¿Estás seguro de que quieres eliminar el grupo "<strong>{modal.data?.name}</strong>"? Esto desvinculará a todos sus miembros del plan compartido.</p>}
                />
            )}
             {modal.isOpen && modal.type === 'removeMember' && (
                <ConfirmationModal
                    isOpen={modal.isOpen}
                    onClose={() => setModal({ type: null, data: null, isOpen: false })}
                    onConfirm={handleConfirmDelete}
                    title="Confirmar Acción"
                    message={<p>¿Quitar a <strong>{modal.data?.personName}</strong> del grupo? Perderá el acceso al plan compartido.</p>}
                />
            )}
            {modal.type === 'form' && (
                <PatientGroupFormModal isOpen={true} onClose={() => setModal({ type: null, data: null, isOpen: false })} onSave={() => { setModal({ type: null, data: null, isOpen: false }); fetchData(); }} groupToEdit={modal.data} allPersons={allPersons} />
            )}
            {modal.type === 'subscription' && (
                <SharedSubscriptionFormModal isOpen={true} onClose={() => setModal({ type: null, data: null, isOpen: false })} onSave={() => { setModal({ type: null, data: null, isOpen: false }); fetchData(); }} group={modal.data} servicePlans={servicePlans} />
            )}

            <section>
                <div style={{...styles.pageHeader, border: 'none', padding: 0}}>
                    <h2>Grupos de Pacientes</h2>
                    <button onClick={() => setModal({ type: 'form', data: null, isOpen: true })}>
                        {ICONS.add} Nuevo Grupo
                    </button>
                </div>
                <p style={{color: 'var(--text-light)', maxWidth: '800px'}}>
                    Administra los grupos de pacientes que comparten un plan de servicio, como planes familiares o de pareja.
                </p>

                {loading && <p>Cargando grupos...</p>}
                {error && <p style={styles.error}>{error}</p>}
                
                {!loading && groups.length > 0 && (
                    <div className="info-grid">
                        {groups.map(group => {
                            const subscription = group.shared_subscriptions?.[0];
                            const plan = subscription?.patient_service_plans;
                            return (
                                <div key={group.id} className="info-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                                    <div style={{flex: 1}}>
                                        <h4 style={{margin: '0 0 1rem 0', color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem'}}>{group.name}</h4>
                                        <div style={{marginBottom: '1rem'}}>
                                            <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)'}}>Plan Compartido</p>
                                            <p style={{margin: '0.25rem 0 0 0', fontWeight: 600}}>{plan?.name || 'No asignado'}</p>
                                            {subscription && <p style={{margin: '0.25rem 0 0 0', fontSize: '0.9rem'}}>Vence: {new Date(subscription.end_date.replace(/-/g, '/')).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>}
                                        </div>

                                        <div>
                                            <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)'}}>Miembros ({group.persons.length})</p>
                                            <ul style={{margin: '0.5rem 0 0 0', paddingLeft: '1.25rem'}}>
                                                {group.persons.map(person => (
                                                    <li key={person.id} style={{marginBottom: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                                        <span>{person.full_name}</span>
                                                        <button 
                                                            onClick={() => setModal({type: 'removeMember', isOpen: true, data: { personId: person.id, personName: person.full_name }})} 
                                                            style={{...styles.iconButton, color: 'var(--error-color)', visibility: group.persons.length > 1 ? 'visible' : 'hidden' }} 
                                                            title="Quitar del grupo">
                                                            &times;
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="card-actions" style={{justifyContent: 'flex-end', paddingTop: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)'}}>
                                        <button onClick={() => setModal({ type: 'subscription', isOpen: true, data: group })} style={{...styles.iconButton}} title="Gestionar Plan">{ICONS.calendar}</button>
                                        <button onClick={() => setModal({ type: 'form', isOpen: true, data: group })} style={styles.iconButton} title="Editar Grupo">{ICONS.edit}</button>
                                        <button onClick={() => setModal({ type: 'deleteGroup', isOpen: true, data: group })} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar Grupo">{ICONS.delete}</button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
                {!loading && groups.length === 0 && (
                    <p>No has creado ningún grupo de pacientes.</p>
                )}
            </section>
        </div>
    );
};

export default PatientGroupsManagement;
