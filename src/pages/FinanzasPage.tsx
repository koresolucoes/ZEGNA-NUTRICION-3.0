
import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { useClinic } from '../contexts/ClinicContext';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { PopulatedPayment } from '../types';
import InvoiceFormModal from '../components/finanzas/InvoiceFormModal';
import ReceiptViewerModal from '../components/finanzas/ReceiptViewerModal';
import FinancialSummaryCard from '../components/finanzas/FinancialSummaryCard';
import RevenueChart from '../components/finanzas/RevenueChart';
import ServicesChart from '../components/finanzas/ServicesChart';

type TimeRange = 'today' | 'week' | 'month';

const FinanzasPage: FC<{ isMobile: boolean; navigate: (page: string, context?: any) => void; }> = ({ isMobile, navigate }) => {
    const { clinic } = useClinic();
    const [payments, setPayments] = useState<PopulatedPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modal, setModal] = useState<{ type: 'invoice' | 'receipt' | null; data: PopulatedPayment | null }>({ type: null, data: null });
    const [timeRange, setTimeRange] = useState<TimeRange>('month');

    const { startDate, endDate } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let start = new Date(today);
        let end = new Date(today);
        end.setHours(23, 59, 59, 999);

        switch (timeRange) {
            case 'today':
                break;
            case 'week':
                start.setDate(today.getDate() - today.getDay());
                break;
            case 'month':
                start.setDate(1);
                break;
        }
        return { startDate: start.toISOString(), endDate: end.toISOString() };
    }, [timeRange]);

    const fetchData = useCallback(async () => {
        if (!clinic) return;
        setLoading(true);
        setError(null);
        try {
            let query = supabase
                .from('payments')
                .select('*, persons(full_name, rfc, fiscal_address, fiscal_regime), services(name), invoices!left(payment_id, status, pdf_url, xml_url)')
                .eq('clinic_id', clinic.id)
                .gte('payment_date', startDate)
                .lte('payment_date', endDate);

            const { data: paymentsData, error } = await query.order('payment_date', { ascending: false });

            if (error) throw error;
            if (!paymentsData) {
                setPayments([]);
                setLoading(false);
                return;
            }

            const userIds = [...new Set(paymentsData.map(p => p.recorded_by_user_id).filter(Boolean))];
            let profileMap = new Map<string, string>();

            if (userIds.length > 0) {
                const { data: profiles, error: profileError } = await supabase
                    .from('nutritionist_profiles')
                    .select('user_id, full_name')
                    .in('user_id', userIds as string[]);
                
                if (profileError) console.warn("Could not fetch nutritionist profiles:", profileError.message);
                else if (profiles) profiles.forEach(p => p.user_id && p.full_name && profileMap.set(p.user_id, p.full_name));
            }
            
            const populatedPayments = paymentsData.map(p => ({
                ...p,
                recorded_by_name: p.recorded_by_user_id ? profileMap.get(p.recorded_by_user_id) || 'N/A' : 'Sistema',
            }));

            setPayments(populatedPayments as any);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [clinic, startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const dashboardStats = useMemo(() => {
        const paidPayments = payments.filter(p => p.status === 'paid');
        const totalRevenue = paidPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const paymentCount = paidPayments.length;
        const averageTicket = paymentCount > 0 ? totalRevenue / paymentCount : 0;

        const serviceCounts = paidPayments.reduce((acc, p) => {
            const serviceName = p.services?.name || 'Otro';
            acc[serviceName] = (acc[serviceName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const bestSellingService = Object.keys(serviceCounts).length > 0
            ? Object.entries(serviceCounts).sort((a, b) => (b[1] as number) - (a[1] as number))[0][0]
            : 'N/A';
        
        const revenueByDay = paidPayments.reduce((acc: Record<string, number>, p) => {
            const date = p.payment_date.split('T')[0];
            const currentVal = acc[date] || 0;
            const amount = Number(p.amount) || 0;
            acc[date] = currentVal + amount;
            return acc;
        }, {} as Record<string, number>);

        const servicesDistribution = paidPayments.reduce((acc: Record<string, number>, p) => {
             const serviceName = p.services?.name || 'Otros';
             const currentVal = acc[serviceName] || 0;
             const amount = Number(p.amount) || 0;
             acc[serviceName] = currentVal + amount;
             return acc;
        }, {} as Record<string, number>);

        return {
            totalRevenue,
            paymentCount,
            averageTicket,
            bestSellingService,
            revenueByDay,
            servicesDistribution
        };
    }, [payments]);

    const statusStyles: { [key: string]: React.CSSProperties } = {
        paid: { backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', borderColor: 'var(--primary-color)' },
        pending: { backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#EAB308', borderColor: '#EAB308' },
        cancelled: { backgroundColor: 'var(--error-bg)', color: 'var(--error-color)', borderColor: 'var(--error-color)' },
    };

    const StatusBadge: FC<{ status: string }> = ({ status }) => (
        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 500, border: '1px solid', textTransform: 'capitalize', ...statusStyles[status] }}>
            {status === 'paid' ? 'Pagado' : status === 'pending' ? 'Pendiente' : 'Cancelado'}
        </span>
    );

    return (
        <div className="fade-in">
            {modal.type === 'invoice' && modal.data && <InvoiceFormModal isOpen={true} onClose={() => setModal({ type: null, data: null })} payment={modal.data} onSuccess={fetchData} />}
            {modal.type === 'receipt' && modal.data && clinic && <ReceiptViewerModal isOpen={true} onClose={() => setModal({ type: null, data: null })} payment={modal.data} clinic={clinic} />}
            
            <div style={styles.pageHeader}><h1>Dashboard Financiero</h1></div>
            
            <div style={{...styles.filterBar, justifyContent: 'flex-end'}}>
                <div style={styles.filterButtonGroup}>
                    <button onClick={() => setTimeRange('today')} className={`filter-button ${timeRange === 'today' ? 'active' : ''}`}>Hoy</button>
                    <button onClick={() => setTimeRange('week')} className={`filter-button ${timeRange === 'week' ? 'active' : ''}`}>Esta Semana</button>
                    <button onClick={() => setTimeRange('month')} className={`filter-button ${timeRange === 'month' ? 'active' : ''}`}>Este Mes</button>
                </div>
            </div>

            <div style={{...styles.dashboardGrid, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '2rem'}}>
                <FinancialSummaryCard title="Ingresos del Periodo" value={`$${dashboardStats.totalRevenue.toFixed(2)}`} icon={ICONS.calculator} />
                <FinancialSummaryCard title="Total de Pagos" value={dashboardStats.paymentCount.toString()} icon={ICONS.check} />
                <FinancialSummaryCard title="Ticket Promedio" value={`$${dashboardStats.averageTicket.toFixed(2)}`} icon={ICONS.activity} />
                <FinancialSummaryCard title="Servicio Más Popular" value={dashboardStats.bestSellingService} icon={ICONS.sparkles} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                <RevenueChart data={dashboardStats.revenueByDay} />
                <ServicesChart data={dashboardStats.servicesDistribution} />
            </div>

            <h2 style={{ fontSize: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem', marginTop: '2rem' }}>Registros Detallados</h2>
            <div style={!isMobile ? styles.tableContainer : {}}>
                {loading ? <p style={{padding: '2rem', textAlign: 'center'}}>Cargando registros...</p> : 
                 error ? <p style={styles.error}>{error}</p> :
                 payments.length === 0 ? <p style={{padding: '2rem', textAlign: 'center'}}>No se encontraron registros de pago para este periodo.</p> :
                 (isMobile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {payments.map(p => {
                            const invoice = p.invoices?.[0];
                            return (
                                <div key={p.id} style={{ backgroundColor: 'var(--surface-color)', borderRadius: '8px', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 600, color: 'var(--primary-color)' }}>{p.persons?.full_name || 'N/A'}</p>
                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)' }}>{p.services?.name || 'N/A'}</p>
                                        </div>
                                        <StatusBadge status={p.status} />
                                    </div>
                                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                                        <div>
                                            <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.8rem' }}>Monto</p>
                                            <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600, fontSize: '1.1rem' }}>${parseFloat(String(p.amount)).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.8rem' }}>Fecha</p>
                                            <p style={{ margin: '0.25rem 0 0 0', fontWeight: 500 }}>{new Date(p.payment_date).toLocaleDateString('es-MX')}</p>
                                        </div>
                                        <div>
                                            <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.8rem' }}>Factura</p>
                                            <p style={{ margin: '0.25rem 0 0 0', fontWeight: 500 }}>{invoice?.status || '-'}</p>
                                        </div>
                                    </div>
                                    <div style={{ ...styles.actionButtons, marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', justifyContent: 'flex-end' }}>
                                        <button onClick={() => setModal({ type: 'receipt', data: p })} style={styles.iconButton} title="Ver Recibo">{ICONS.file}</button>
                                        {invoice ? (
                                            <>
                                                {invoice.pdf_url && <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer" style={styles.iconButton} title="Descargar PDF">{ICONS.download}</a>}
                                            </>
                                        ) : ( p.status === 'paid' &&
                                            <button onClick={() => setModal({ type: 'invoice', data: p })} style={styles.iconButton} title="Generar Factura">{ICONS.calculator}</button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                 ) : (
                    <table style={styles.table}>
                        <thead><tr>
                            <th style={styles.th}>Paciente</th><th style={styles.th}>Servicio</th><th style={{...styles.th, textAlign: 'right'}}>Monto</th><th style={styles.th}>Fecha</th><th style={styles.th}>Estado</th><th style={styles.th}>Factura</th><th style={styles.th}>Acciones</th>
                        </tr></thead>
                        <tbody>{payments.map(p => {
                            const invoice = p.invoices?.[0];
                            return (
                                <tr key={p.id} className="table-row-hover">
                                    <td style={styles.td}>{p.persons?.full_name || 'N/A'}</td>
                                    <td style={styles.td}>{p.services?.name || 'N/A'}</td>
                                    <td style={{...styles.td, textAlign: 'right', fontWeight: 600}}>${parseFloat(String(p.amount)).toFixed(2)}</td>
                                    <td style={styles.td}>{new Date(p.payment_date).toLocaleDateString('es-MX')}</td>
                                    <td style={styles.td}><StatusBadge status={p.status} /></td>
                                    <td style={styles.td}>{invoice?.status || '-'}</td>
                                    <td style={styles.td}>
                                        <div style={styles.actionButtons}>
                                            <button onClick={() => setModal({ type: 'receipt', data: p })} style={styles.iconButton} title="Ver Recibo">{ICONS.file}</button>
                                            {invoice ? (
                                                <>
                                                    {invoice.pdf_url && <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer" style={styles.iconButton} title="Descargar PDF">{ICONS.download}</a>}
                                                </>
                                            ) : ( p.status === 'paid' &&
                                                <button onClick={() => setModal({ type: 'invoice', data: p })} style={styles.iconButton} title="Generar Factura">{ICONS.calculator}</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}</tbody>
                    </table>
                ))}
            </div>
        </div>
    );
};

export default FinanzasPage;
