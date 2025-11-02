import React, { FC, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../supabase';
import { Person, TeamMember } from '../types';
import { useClinic } from '../contexts/ClinicContext';

interface ClientsPageProps {
  isMobile: boolean;
  onViewDetails: (personId: string) => void;
  onAddClient: () => void;
  onEditClient: (personId: string) => void;
}

const ClientsPage: FC<ClientsPageProps> = ({ isMobile, onViewDetails, onAddClient, onEditClient }) => {
    const { clinic } = useClinic();
    const [clients, setClients] = useState<Person[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [lastConsultations, setLastConsultations] = useState<Map<string, string>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [professionalFilter, setProfessionalFilter] = useState('all');
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(8);

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const fetchData = useCallback(async () => {
        if (!clinic) return;
        setLoading(true);
        setError(null);
        try {
            const [clientsRes, teamRes] = await Promise.all([
                supabase.from('persons').select('*').eq('clinic_id', clinic.id).eq('person_type', 'client').order('full_name'),
                supabase.from('team_members_with_profiles').select('*').eq('clinic_id', clinic.id)
            ]);

            if (clientsRes.error) throw clientsRes.error;
            if (teamRes.error) throw teamRes.error;
            
            setClients(clientsRes.data || []);
            setTeamMembers(teamRes.data || []);

            if (clientsRes.data && clientsRes.data.length > 0) {
                const clientIds = clientsRes.data.map(c => c.id);
                const { data: consultsData, error: consultsError } = await supabase
                    .rpc('get_last_consultation_for_persons', { p_person_ids: clientIds });

                if (consultsError) throw consultsError;

                const consultMap = new Map<string, string>();
                if (consultsData) {
                    consultsData.forEach((item: any) => {
                        consultMap.set(item.person_id, item.last_consultation_date);
                    });
                }
                setLastConsultations(consultMap);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [clinic]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const memberMap = useMemo(() => new Map(teamMembers.map(m => [m.user_id, m.full_name])), [teamMembers]);

    const filteredClients = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        return clients.filter(client => {
            const nameMatch = client.full_name.toLowerCase().includes(searchTerm.toLowerCase());
            const folioMatch = client.folio?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const statusMatch = statusFilter === 'Todos' ||
                (statusFilter === 'Ativo' && (!client.subscription_end_date || new Date(client.subscription_end_date) >= today)) ||
                (statusFilter === 'Inativo' && client.subscription_end_date && new Date(client.subscription_end_date) < today);

            const professionalMatch = professionalFilter === 'all' || client.created_by_user_id === professionalFilter;

            return (nameMatch || folioMatch) && statusMatch && professionalMatch;
        });
    }, [clients, searchTerm, statusFilter, professionalFilter]);

    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
    const paginatedClients = filteredClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const renderPagination = () => {
        const pages = [];
        const maxPagesToShow = 5;
        
        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);

            if (currentPage <= 2) end = 3;
            if (currentPage >= totalPages - 1) start = totalPages - 2;

            for (let i = start; i <= end; i++) pages.push(i);

            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }

        return (
            <nav className="pagination-container">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="pagination-button">‹</button>
                {pages.map((page, index) =>
                    page === '...' ?
                    <span key={index} className="pagination-button border-none">...</span> :
                    <button key={index} onClick={() => setCurrentPage(page as number)} className={`pagination-button ${currentPage === page ? 'active' : ''}`}>{page}</button>
                )}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="pagination-button">›</button>
            </nav>
        );
    };

    const StatusBadge: FC<{ status: 'Ativo' | 'Inativo' }> = ({ status }) => (
        <div className={`status-badge ${status === 'Ativo' ? 'status-active' : 'status-inactive'}`}>
            <div className="status-badge-dot"></div>
            <span>{status}</span>
        </div>
    );

    return (
        <div style={{ backgroundColor: 'var(--surface-color)', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)', padding: isMobile ? '1rem' : '2rem' }} className="fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-800" style={{color: 'var(--text-color)'}}>Gerenciamento de Pacientes</h1>
                <button onClick={onAddClient}>+ Adicionar Novo Paciente</button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="relative md:col-span-2 lg:col-span-2">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nome, CPF ou identificador..."
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="pl-10 !mb-0"
                    />
                </div>
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="!mb-0">
                    <option value="Todos">Status: Todos</option>
                    <option value="Ativo">Status: Ativo</option>
                    <option value="Inativo">Status: Inativo</option>
                </select>
                <select value={professionalFilter} onChange={e => { setProfessionalFilter(e.target.value); setCurrentPage(1); }} className="!mb-0">
                    <option value="all">Profissional: Todos</option>
                    {teamMembers.map(member => (
                        <option key={member.user_id} value={member.user_id!}>{member.full_name}</option>
                    ))}
                </select>
            </div>

            {loading && <p>Carregando pacientes...</p>}
            {error && <p className="text-red-500">{error}</p>}
            
            {/* Table */}
            {!loading && !error && (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500" style={{color: 'var(--text-light)'}}>
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50" style={{backgroundColor: 'var(--surface-hover-color)', color: 'var(--text-light)'}}>
                        <tr>
                            <th scope="col" className="px-6 py-3">Nome Completo</th>
                            <th scope="col" className="px-6 py-3">CPF</th>
                            <th scope="col" className="px-6 py-3">Data de Nasc.</th>
                            <th scope="col" className="px-6 py-3">Profissional Responsável</th>
                            <th scope="col" className="px-6 py-3">Última Consulta</th>
                            <th scope="col" className="px-6 py-3">Status</th>
                            <th scope="col" className="px-6 py-3"><span className="sr-only">Ações</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedClients.map(client => {
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            const isActive = !client.subscription_end_date || new Date(client.subscription_end_date) >= today;
                            const professional = client.created_by_user_id ? memberMap.get(client.created_by_user_id) : 'N/A';
                            const lastConsult = lastConsultations.get(client.id);

                            return (
                                <tr key={client.id} className="bg-white border-b hover:bg-gray-50" style={{backgroundColor: 'var(--surface-color)', borderBottomColor: 'var(--border-color)'}}>
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap" style={{color: 'var(--text-color)'}}>
                                        <div className="flex items-center gap-3">
                                            <img className="w-10 h-10 rounded-full object-cover" src={client.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${client.full_name}&radius=50`} alt="Avatar" />
                                            <div>
                                                <div className="font-semibold">{client.full_name}</div>
                                                <div style={{color: 'var(--text-light)'}}>{client.phone_number || client.folio}</div>
                                            </div>
                                        </div>
                                    </th>
                                    <td className="px-6 py-4">{client.curp || '-'}</td>
                                    <td className="px-6 py-4">{client.birth_date ? new Date(client.birth_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                                    <td className="px-6 py-4">{professional}</td>
                                    <td className="px-6 py-4">{lastConsult ? new Date(lastConsult).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={isActive ? 'Ativo' : 'Inativo'} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div ref={openMenuId === client.id ? menuRef : null} className="relative">
                                            <button onClick={() => setOpenMenuId(openMenuId === client.id ? null : client.id)} className="p-2 rounded-full hover:bg-gray-100" style={{color: 'var(--text-light)'}}>
                                                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path></svg>
                                            </button>
                                            {openMenuId === client.id && (
                                                <div className="absolute right-0 z-10 mt-2 w-48 rounded-md shadow-lg py-1" style={{backgroundColor: 'var(--background-color)', border: '1px solid var(--border-color)'}}>
                                                    <a onClick={() => onViewDetails(client.id)} className="block px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" style={{color: 'var(--text-color)'}}>Ver Detalhes</a>
                                                    <a onClick={() => onEditClient(client.id)} className="block px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" style={{color: 'var(--text-color)'}}>Editar</a>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                 {paginatedClients.length === 0 && <p className="text-center p-8" style={{color: 'var(--text-light)'}}>Nenhum paciente encontrado.</p>}
            </div>
            )}
            {/* Footer */}
            <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
                 <span className="text-sm" style={{color: 'var(--text-light)'}}>
                    Mostrando <span className="font-semibold" style={{color: 'var(--text-color)'}}>{Math.min(1 + (currentPage - 1) * itemsPerPage, filteredClients.length)}</span> a <span className="font-semibold" style={{color: 'var(--text-color)'}}>{Math.min(currentPage * itemsPerPage, filteredClients.length)}</span> de <span className="font-semibold" style={{color: 'var(--text-color)'}}>{filteredClients.length}</span> resultados
                </span>
                {totalPages > 1 && renderPagination()}
            </div>
        </div>
    );
};

export default ClientsPage;
