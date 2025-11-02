import React, { FC, useState, useEffect, FormEvent, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { useClinic } from '../../contexts/ClinicContext';
import { TeamMember } from '../../types';
import ConfirmationModal from '../shared/ConfirmationModal';

interface TeamManagementProps {
    user: User;
}

const TeamManagement: FC<TeamManagementProps> = ({ user }) => {
    const { clinic, subscription } = useClinic();
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('nutritionist');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
    const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
    const [roomInputs, setRoomInputs] = useState<Record<string, string>>({});
    const [savingRoomFor, setSavingRoomFor] = useState<string | null>(null);
    const [savedRoomFor, setSavedRoomFor] = useState<string | null>(null);

    const isTeamLimitReached = useMemo(() => {
        if (!subscription || !subscription.plans) return true; // Default to locked if no sub info
        const max = subscription.plans.max_professionals;
        return team.length >= max;
    }, [team, subscription]);

    const fetchTeam = useCallback(async () => {
        if (!clinic) return;
        setLoading(true);
        setError(null);
        try {
            const { data: teamData, error } = await supabase.from('team_members_with_profiles').select('*').eq('clinic_id', clinic.id);
            if (error) throw error;
            setTeam(teamData || []);
            const initialRooms = (teamData || []).reduce((acc, member) => {
                if (member.user_id) {
                    acc[member.user_id] = member.consulting_room || '';
                }
                return acc;
            }, {} as Record<string, string>);
            setRoomInputs(initialRooms);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [clinic]);

    useEffect(() => {
        fetchTeam();
    }, [fetchTeam]);

    useEffect(() => {
        if (!clinic) return;
        
        const channel = supabase.channel('team-management-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'clinic_members',
                    filter: `clinic_id=eq.${clinic.id}`
                },
                (payload) => {
                    console.log('Change detected in clinic_members, refetching team data.', payload);
                    fetchTeam();
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Realtime subscription started for TeamManagement.');
                }
                if (status === 'CLOSED') {
                    console.log('Realtime subscription closed for TeamManagement.');
                }
                if (status === 'CHANNEL_ERROR') {
                    console.error('Realtime subscription error on TeamManagement:', err);
                }
            });

        return () => {
            console.log('Cleaning up realtime subscription for TeamManagement.');
            supabase.removeChannel(channel);
        };
    }, [clinic, fetchTeam]);
    
    const handleInvite = async (e: FormEvent) => {
        e.preventDefault();
        if (!clinic || !inviteEmail || isTeamLimitReached) return;
        setInviteLoading(true);
        setInviteError(null);
        setInviteSuccess(null);

        try {
            const response = await fetch('/api/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: inviteEmail,
                    role: inviteRole,
                    clinic_id: clinic.id,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                // The API should return a JSON object with an 'error' key
                throw new Error(result.error || `Error del servidor: ${response.statusText}`);
            }

            setInviteSuccess(result.message);
            setInviteEmail('');
            setInviteRole('nutritionist');
            
        } catch (err: any) {
            setInviteError(`Error al enviar invitación: ${err.message}`);
        } finally {
            setInviteLoading(false);
        }
    };

    const handleRoomUpdate = async (userId: string, room: string) => {
        setSavingRoomFor(userId);
        setError(null);
        setSavedRoomFor(null);
        const { error } = await supabase
            .from('nutritionist_profiles')
            .update({ consulting_room: room })
            .eq('user_id', userId);

        if (error) {
            setError(`Error al actualizar consultorio: ${error.message}`);
        } else {
            setSavedRoomFor(userId);
            setTimeout(() => setSavedRoomFor(null), 2000);
            await fetchTeam(); 
        }
        setSavingRoomFor(null);
    };


    const handleRemoveMember = async () => {
        if (!memberToRemove || !clinic) return;
        
        try {
            const { error: dbError } = await supabase
                .from('clinic_members')
                .delete()
                .eq('user_id', memberToRemove.user_id)
                .eq('clinic_id', clinic.id);

            if (dbError) throw dbError;
            
            setMemberToRemove(null);
        } catch (err: any) {
            setError(`Error al eliminar miembro: ${err.message}`);
        }
    };
    
    const successMessageStyle: React.CSSProperties = { ...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)' };

    return (
        <div className="fade-in" style={{ maxWidth: '800px' }}>
            {memberToRemove && (
                <ConfirmationModal
                    isOpen={!!memberToRemove}
                    onClose={() => setMemberToRemove(null)}
                    onConfirm={handleRemoveMember}
                    title="Confirmar Eliminación"
                    message={<p>¿Estás seguro de que quieres eliminar a <strong>{memberToRemove.full_name || memberToRemove.user_id}</strong> de la clínica? Perderá todo el acceso.</p>}
                />
            )}
            <section style={{ marginBottom: '2.5rem' }}>
                <h2>Invitar Nuevo Miembro</h2>
                {isTeamLimitReached && (
                    <div style={{...styles.error, backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#EAB308', borderColor: '#EAB308'}}>
                        Has alcanzado el límite de <strong>{subscription?.plans?.max_professionals} profesionales</strong> para tu plan <strong>{subscription?.plans?.name}</strong>. Para añadir más miembros, por favor actualiza tu suscripción.
                    </div>
                )}
                <form onSubmit={handleInvite}>
                    {inviteError && <p style={styles.error}>{inviteError}</p>}
                    {inviteSuccess && <p style={successMessageStyle}>{inviteSuccess}</p>}
                    <fieldset disabled={isTeamLimitReached}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                            <div style={{ flex: 2 }}>
                                <label htmlFor="invite-email">Correo Electrónico</label>
                                <input id="invite-email" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required style={{marginBottom: 0}} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label htmlFor="invite-role">Rol</label>
                                <select id="invite-role" value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{marginBottom: 0}}>
                                    <option value="nutritionist">Nutricionista</option>
                                    <option value="admin">Administrador</option>
                                    <option value="assistant">Asistente</option>
                                    <option value="receptionist">Recepcionista</option>
                                </select>
                            </div>
                            <button type="submit" disabled={inviteLoading} style={{marginBottom: 0}}>{inviteLoading ? 'Enviando...' : 'Enviar Invitación'}</button>
                        </div>
                    </fieldset>
                </form>
            </section>
            
            <section>
                <h2>Equipo Actual ({team.length} / {subscription?.plans?.max_professionals || '...'})</h2>
                {loading && <p>Cargando equipo...</p>}
                {error && <p style={styles.error}>{error}</p>}
                {!loading && (
                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Miembro</th>
                                    <th style={styles.th}>Rol</th>
                                    <th style={styles.th}>Consultorio</th>
                                    <th style={styles.th}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {team.map(member => (
                                    <tr key={member.user_id}>
                                        <td style={styles.td}>
                                            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                                                <img src={member.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${member.full_name || member.user_id}&radius=50`} alt="avatar" style={{width: '32px', height: '32px', borderRadius: '50%'}} />
                                                <div>
                                                    <p style={{margin: 0, fontWeight: 500}}>{member.full_name || 'Sin nombre'}</p>
                                                    <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--text-light)'}}>{member.user_id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={styles.td}><span className={`role-badge role-${member.role}`} style={{textTransform: 'capitalize'}}>{member.role}</span></td>
                                        <td style={styles.td}>
                                            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                                <input 
                                                    type="text"
                                                    value={roomInputs[member.user_id!] || ''}
                                                    onChange={(e) => {
                                                        const { value } = e.target;
                                                        setRoomInputs(prev => ({...prev, [member.user_id!]: value }));
                                                    }}
                                                    placeholder="Ej: 1A"
                                                    style={{width: '80px', margin: 0, padding: '8px'}}
                                                    disabled={savingRoomFor === member.user_id}
                                                />
                                                <div style={{width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                                    {savingRoomFor === member.user_id ? (
                                                        <span style={{ animation: 'spin 1s linear infinite' }}>{ICONS.clock}</span>
                                                    ) : savedRoomFor === member.user_id ? (
                                                        <span style={{ color: 'var(--primary-color)' }}>{ICONS.check}</span>
                                                    ) : (
                                                        <button 
                                                            onClick={() => member.user_id && handleRoomUpdate(member.user_id, roomInputs[member.user_id!])}
                                                            disabled={!member.user_id || roomInputs[member.user_id!] === (member.consulting_room || '')}
                                                            style={{...styles.iconButton, padding: '8px', border: '1px solid var(--border-color)'}}
                                                            title="Guardar"
                                                            className="nav-item-hover"
                                                        >
                                                            {ICONS.save}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            {member.user_id !== user.id && (
                                                 <button onClick={() => setMemberToRemove(member)} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar miembro">{ICONS.delete}</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
};

export default TeamManagement;