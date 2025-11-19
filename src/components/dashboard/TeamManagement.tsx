
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clinic_members', filter: `clinic_id=eq.${clinic.id}` }, () => fetchTeam())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail, role: inviteRole, clinic_id: clinic.id }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || `Error del servidor: ${response.statusText}`);

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
        const { error } = await supabase.from('nutritionist_profiles').update({ consulting_room: room }).eq('user_id', userId);
        if (error) setError(`Error al actualizar consultorio: ${error.message}`);
        else {
            setSavedRoomFor(userId);
            setTimeout(() => setSavedRoomFor(null), 2000);
            await fetchTeam(); 
        }
        setSavingRoomFor(null);
    };

    const handleRemoveMember = async () => {
        if (!memberToRemove || !clinic) return;
        try {
            const { error: dbError } = await supabase.from('clinic_members').delete().eq('user_id', memberToRemove.user_id).eq('clinic_id', clinic.id);
            if (dbError) throw dbError;
            setMemberToRemove(null);
        } catch (err: any) {
            setError(`Error al eliminar miembro: ${err.message}`);
        }
    };

    // --- Visual Components ---

    const cardStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface-hover-color)',
        padding: '2rem',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        marginBottom: '2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
    };

    const labelStyle: React.CSSProperties = {
        display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-color)'
    };

    const inputStyle: React.CSSProperties = {
        ...styles.input, backgroundColor: 'var(--background-color)', borderColor: 'var(--border-color)', marginBottom: 0
    };
    
    return (
        <div className="fade-in" style={{ maxWidth: '1000px' }}>
            {memberToRemove && (
                <ConfirmationModal
                    isOpen={!!memberToRemove}
                    onClose={() => setMemberToRemove(null)}
                    onConfirm={handleRemoveMember}
                    title="Eliminar Miembro"
                    message={<p>¿Estás seguro de que quieres eliminar a <strong>{memberToRemove.full_name || memberToRemove.user_id}</strong>? Perderá el acceso inmediatamente.</p>}
                    confirmButtonClass="button-danger"
                />
            )}

            {/* Invite Section */}
            <section style={cardStyle}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                    <div>
                        <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-color)'}}>Invitar Nuevo Miembro</h3>
                        <p style={{margin: '0.25rem 0 0 0', color: 'var(--text-light)', fontSize: '0.9rem'}}>Envía una invitación por correo electrónico.</p>
                    </div>
                    <span style={{fontSize: '0.8rem', fontWeight: 600, padding: '4px 12px', borderRadius: '20px', backgroundColor: isTeamLimitReached ? 'var(--error-bg)' : 'var(--primary-light)', color: isTeamLimitReached ? 'var(--error-color)' : 'var(--primary-color)'}}>
                        {team.length} / {subscription?.plans?.max_professionals} Puestos Usados
                    </span>
                </div>

                {isTeamLimitReached && (
                    <div style={{...styles.error, backgroundColor: 'rgba(234, 179, 8, 0.1)', color: '#D97706', borderColor: '#FCD34D', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <span>⚠️</span> Has alcanzado el límite de profesionales. Actualiza tu plan para invitar a más.
                    </div>
                )}

                <form onSubmit={handleInvite}>
                    {inviteError && <p style={styles.error}>{inviteError}</p>}
                    {inviteSuccess && <p style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)'}}>{inviteSuccess}</p>}
                    
                    <fieldset disabled={isTeamLimitReached} style={{border: 'none', padding: 0, margin: 0}}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                            <div>
                                <label style={labelStyle}>Correo Electrónico</label>
                                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required style={inputStyle} placeholder="correo@ejemplo.com" />
                            </div>
                            <div>
                                <label style={labelStyle}>Rol</label>
                                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={inputStyle}>
                                    <option value="nutritionist">Nutricionista</option>
                                    <option value="admin">Administrador</option>
                                    <option value="assistant">Asistente</option>
                                    <option value="receptionist">Recepcionista</option>
                                </select>
                            </div>
                            <button type="submit" disabled={inviteLoading} className="button-primary" style={{height: '42px', padding: '0 1.5rem'}}>
                                {inviteLoading ? 'Enviando...' : 'Enviar'}
                            </button>
                        </div>
                    </fieldset>
                </form>
            </section>
            
            {/* Team List Section */}
            <section>
                <h3 style={{fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-color)', marginBottom: '1rem'}}>Directorio del Equipo</h3>
                {loading && <p>Cargando equipo...</p>}
                {error && <p style={styles.error}>{error}</p>}
                
                {!loading && (
                    <div style={{...styles.tableContainer, border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={{backgroundColor: 'var(--surface-color)'}}>
                                    <th style={styles.th}>Miembro</th>
                                    <th style={styles.th}>Rol</th>
                                    <th style={styles.th}>Consultorio</th>
                                    <th style={{...styles.th, textAlign: 'right'}}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {team.map(member => (
                                    <tr key={member.user_id} style={{borderBottom: '1px solid var(--border-color)'}}>
                                        <td style={{...styles.td, padding: '1rem 1.5rem'}}>
                                            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                                                <img src={member.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${member.full_name || member.user_id}&radius=50`} alt="avatar" style={{width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)'}} />
                                                <div>
                                                    <p style={{margin: 0, fontWeight: 600, color: 'var(--text-color)'}}>{member.full_name || 'Pendiente de registro'}</p>
                                                    <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)'}}>{member.user_id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{
                                                textTransform: 'capitalize', fontSize: '0.8rem', fontWeight: 600, padding: '4px 10px', borderRadius: '12px',
                                                backgroundColor: member.role === 'admin' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                                color: member.role === 'admin' ? '#EF4444' : '#3B82F6'
                                            }}>
                                                {member.role}
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                                <input 
                                                    type="text"
                                                    value={roomInputs[member.user_id!] || ''}
                                                    onChange={(e) => setRoomInputs(prev => ({...prev, [member.user_id!]: e.target.value }))}
                                                    placeholder="-"
                                                    style={{...styles.input, width: '60px', margin: 0, padding: '0.4rem', textAlign: 'center', backgroundColor: 'transparent'}}
                                                    disabled={savingRoomFor === member.user_id}
                                                />
                                                {savingRoomFor === member.user_id ? <span style={{ animation: 'spin 1s linear infinite', fontSize: '0.9rem' }}>⏳</span> : 
                                                 savedRoomFor === member.user_id ? <span style={{ color: 'var(--primary-color)', fontSize: '1rem' }}>✓</span> :
                                                 <button onClick={() => member.user_id && handleRoomUpdate(member.user_id, roomInputs[member.user_id!])} disabled={!member.user_id || roomInputs[member.user_id!] === (member.consulting_room || '')} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: '4px'}} title="Guardar">{ICONS.save}</button>
                                                }
                                            </div>
                                        </td>
                                        <td style={{...styles.td, textAlign: 'right'}}>
                                            {member.user_id !== user.id && (
                                                 <button onClick={() => setMemberToRemove(member)} style={{...styles.iconButton, color: 'var(--error-color)', marginLeft: 'auto'}} title="Eliminar miembro">{ICONS.delete}</button>
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
