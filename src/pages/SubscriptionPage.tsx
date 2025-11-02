import React, { FC, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useClinic } from '../contexts/ClinicContext';
import { Plan, ClinicSubscription } from '../types';
import { styles } from '../constants';
import { ICONS } from './AuthPage';

const SubscriptionPage: FC<{ navigate: (page: string, context?: any) => void; }> = ({ navigate }) => {
    const { clinic } = useClinic();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [subscription, setSubscription] = useState<(ClinicSubscription & { plans: Plan | null }) | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!clinic) return;
            setLoading(true);
            setError(null);
            try {
                const [plansRes, subRes] = await Promise.all([
                    supabase.from('plans').select('*').order('price_monthly'),
                    supabase.from('clinic_subscriptions').select('*, plans(*)').eq('clinic_id', clinic.id).single()
                ]);

                if (plansRes.error) throw plansRes.error;
                if (subRes.error && subRes.error.code !== 'PGRST116') throw subRes.error;

                setPlans(plansRes.data || []);
                setSubscription(subRes.data as any || null);

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [clinic]);
    
    const handleSubscribe = async (planId: string) => {
        if (!clinic) return;
        setSubscribingPlanId(planId);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error("No estás autenticado. Por favor, inicia sesión de nuevo.");
            }

            const response = await fetch('/api/create-mercadopago-preference', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ planId, clinicId: clinic.id, billingCycle }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'No se pudo iniciar el proceso de pago.');
            }

            // Redirect to Mercado Pago checkout
            window.location.href = data.init_point;

        } catch (err: any) {
            setError(err.message);
            setSubscribingPlanId(null);
        }
    };

    return (
        <div className="fade-in" style={{ maxWidth: '1000px' }}>
            <div style={styles.pageHeader}>
                <h1>Suscripción y Pagos</h1>
            </div>
            <p style={{ marginTop: '-1.5rem', marginBottom: '2rem', color: 'var(--text-light)' }}>
                Gestiona el plan de tu clínica para acceder a más funcionalidades y aumentar los límites de tu equipo.
            </p>

            {loading && <p>Cargando información de suscripción...</p>}
            {error && <p style={styles.error}>{error}</p>}

            {!loading && subscription?.plans && (
                <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface-color)', borderRadius: '12px', marginBottom: '2rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Tu Plan Actual</h2>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>{subscription.plans.name}</p>
                            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-light)' }}>
                                Vence el: {new Date(subscription.current_period_end).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                        <button className="button-secondary">Gestionar en Mercado Pago</button>
                    </div>
                </div>
            )}
            
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--surface-color)', padding: '0.5rem', borderRadius: '50px' }}>
                    <span style={{ fontWeight: billingCycle === 'monthly' ? 600 : 400, color: billingCycle === 'monthly' ? 'var(--text-color)' : 'var(--text-light)'}}>Mensual</span>
                    <label className="switch">
                        <input type="checkbox" checked={billingCycle === 'yearly'} onChange={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')} />
                        <span className="slider round"></span>
                    </label>
                    <span style={{ fontWeight: billingCycle === 'yearly' ? 600 : 400, color: billingCycle === 'yearly' ? 'var(--text-color)' : 'var(--text-light)'}}>Anual (2 meses gratis)</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'stretch' }}>
                {plans.map(plan => {
                    const isCurrentPlan = subscription?.plan_id === plan.id;
                    const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
                    const features = plan.features as any;
                    const isSubscribing = subscribingPlanId === plan.id;

                    return (
                        <div key={plan.id} style={{
                            backgroundColor: 'var(--surface-color)', 
                            borderRadius: '12px', 
                            padding: '2rem', 
                            display: 'flex', 
                            flexDirection: 'column',
                            border: `2px solid ${isCurrentPlan ? 'var(--primary-color)' : 'var(--border-color)'}`,
                            position: 'relative'
                        }}>
                            {isCurrentPlan && (
                                <div style={{
                                    position: 'absolute',
                                    top: '1rem',
                                    right: '1rem',
                                    backgroundColor: 'var(--primary-color)',
                                    color: 'white',
                                    padding: '4px 12px',
                                    borderRadius: '16px',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                }}>
                                    Plan Actual
                                </div>
                            )}
                            <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{plan.name}</h3>
                            <p style={{ color: 'var(--text-light)', flex: 1 }}>{plan.description}</p>
                            
                            <p style={{ margin: '1.5rem 0' }}>
                                <span style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--primary-color)' }}>${price}</span>
                                <span style={{ color: 'var(--text-light)' }}> / {billingCycle === 'monthly' ? 'mes' : 'año'}</span>
                            </p>
                            
                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                                <li style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>✅ <strong>{plan.max_professionals}</strong> Profesionales</li>
                                <li style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>✅ <strong>{features.max_patients === -1 ? 'Ilimitados' : features.max_patients}</strong> Pacientes</li>
                                <li style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>{features.ai_assistant ? '✅' : '❌'} Asistente con IA</li>
                                <li style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>{!features.branding ? '✅' : '❌'} Marca Blanca</li>
                            </ul>

                            <button onClick={() => handleSubscribe(plan.id)} disabled={isCurrentPlan || !!subscribingPlanId} style={{ width: '100%', marginTop: 'auto' }}>
                                {isCurrentPlan ? 'Plan Actual' : isSubscribing ? 'Redirigiendo...' : 'Suscribirse'}
                            </button>
                        </div>
                    );
                })}
            </div>

        </div>
    );
};

export default SubscriptionPage;