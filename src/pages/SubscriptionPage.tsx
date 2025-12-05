
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

    const FeatureItem: FC<{ label: string; included: boolean }> = ({ label, included }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
            <div style={{ 
                width: '20px', height: '20px', borderRadius: '50%', 
                backgroundColor: included ? 'var(--primary-light)' : 'var(--surface-hover-color)', 
                color: included ? 'var(--primary-color)' : 'var(--text-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem',
                flexShrink: 0
            }}>
                {included ? '✓' : '✕'}
            </div>
            <span style={{ color: included ? 'var(--text-color)' : 'var(--text-light)', textDecoration: included ? 'none' : 'line-through', opacity: included ? 1 : 0.7 }}>
                {label}
            </span>
        </div>
    );

    return (
        <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
            
             {/* Hero Header */}
             <div style={{textAlign: 'center', marginBottom: '3rem', padding: '2.5rem', background: 'linear-gradient(135deg, var(--surface-color) 0%, var(--surface-hover-color) 100%)', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'}}>
                <h1 style={{fontSize: '2.5rem', fontWeight: 800, background: 'linear-gradient(to right, var(--primary-color), var(--accent-color))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 1rem 0'}}>Suscripción y Pagos</h1>
                <p style={{color: 'var(--text-light)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto'}}>
                    Gestiona el plan de tu clínica para acceder a más funcionalidades y aumentar los límites de tu equipo.
                </p>
            </div>

            {loading && <div style={{textAlign: 'center', padding: '4rem', color: 'var(--text-light)'}}>Cargando información...</div>}
            {error && <p style={styles.error}>{error}</p>}

            {/* Active Subscription Status Banner */}
            {!loading && subscription?.plans && (
                <div style={{ 
                    padding: '1.5rem 2rem', 
                    backgroundColor: 'var(--surface-color)', 
                    borderRadius: '16px', 
                    marginBottom: '3rem', 
                    border: `1px solid var(--primary-color)`,
                    boxShadow: '0 4px 15px rgba(56, 189, 248, 0.1)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1.5rem',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                        <div style={{
                            width: '50px', height: '50px', borderRadius: '12px', 
                            backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem'
                        }}>
                            {ICONS.star}
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Plan Activo</p>
                            <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-color)' }}>{subscription.plans.name}</h3>
                        </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-light)' }}>Próxima renovación</p>
                        <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600, fontSize: '1.1rem' }}>
                            {new Date(subscription.current_period_end).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>

                    <button className="button-secondary" style={{padding: '0.75rem 1.5rem'}}>
                        Gestionar en Mercado Pago
                    </button>
                </div>
            )}
            
            {/* Billing Toggle */}
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1.5rem', backgroundColor: 'var(--surface-color)', padding: '0.75rem 1.5rem', borderRadius: '50px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
                    <span style={{ fontWeight: billingCycle === 'monthly' ? 700 : 500, color: billingCycle === 'monthly' ? 'var(--text-color)' : 'var(--text-light)', transition: 'color 0.2s'}}>Mensual</span>
                    <label className="switch">
                        <input type="checkbox" checked={billingCycle === 'yearly'} onChange={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')} />
                        <span className="slider round"></span>
                    </label>
                    <span style={{ fontWeight: billingCycle === 'yearly' ? 700 : 500, color: billingCycle === 'yearly' ? 'var(--text-color)' : 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'color 0.2s'}}>
                        Anual 
                        <span style={{fontSize: '0.7rem', backgroundColor: '#10B981', color: 'white', padding: '2px 8px', borderRadius: '10px'}}>AHORRA 20%</span>
                    </span>
                </div>
            </div>

            {/* Plans Grid */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
                gap: '2rem', 
                alignItems: 'stretch' 
            }}>
                {plans.map((plan, index) => {
                    const isCurrentPlan = subscription?.plan_id === plan.id;
                    const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
                    const features = plan.features as any;
                    const isSubscribing = subscribingPlanId === plan.id;
                    
                    // Highlight logic (e.g., middle plan or expensive one)
                    const isHighlight = index === 1 && plans.length >= 3;

                    return (
                        <div key={plan.id} className="card-hover" style={{
                            backgroundColor: 'var(--surface-color)', 
                            borderRadius: '24px', 
                            display: 'flex', 
                            flexDirection: 'column',
                            border: isCurrentPlan ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                            position: 'relative',
                            overflow: 'hidden',
                            transform: isHighlight ? 'scale(1.02)' : 'none',
                            boxShadow: isHighlight ? '0 20px 40px -10px rgba(0,0,0,0.1)' : 'var(--shadow)'
                        }}>
                            {isHighlight && (
                                <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: 'linear-gradient(90deg, var(--primary-color), var(--accent-color))'}}></div>
                            )}
                            
                            {isCurrentPlan && (
                                <div style={{
                                    position: 'absolute',
                                    top: '1.5rem',
                                    right: '1.5rem',
                                    backgroundColor: 'var(--primary-color)',
                                    color: 'white',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Tu Plan
                                </div>
                            )}

                            <div style={{ padding: '2.5rem 2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-color)' }}>{plan.name}</h3>
                                <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.95rem', minHeight: '3em', lineHeight: 1.5 }}>{plan.description}</p>
                                
                                <div style={{ margin: '2rem 0', display: 'flex', alignItems: 'baseline' }}>
                                    <span style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--text-color)', letterSpacing: '-2px' }}>
                                        ${(price || 0).toFixed(0)}
                                    </span>
                                    <span style={{ color: 'var(--text-light)', marginLeft: '0.5rem', fontWeight: 500, fontSize: '1.1rem' }}> / {billingCycle === 'monthly' ? 'mes' : 'año'}</span>
                                </div>

                                <div style={{ flex: 1, borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '1.5rem' }}>LO QUE OBTIENES</p>
                                    <FeatureItem label={plan.max_professionals > 1 ? `${plan.max_professionals} Profesionales` : '1 Profesional'} included={true} />
                                    <FeatureItem label={features.max_patients === -1 ? 'Pacientes Ilimitados' : `Hasta ${features.max_patients} Pacientes`} included={true} />
                                    <FeatureItem label="Asistente con IA (Gemini)" included={features.ai_assistant !== false} />
                                    <FeatureItem label="Marca Blanca (Tu Logo)" included={!features.branding} />
                                    <FeatureItem label="Portal de Paciente" included={true} />
                                    <FeatureItem label="Facturación CFDI 4.0" included={plan.name !== 'Gratis'} />
                                </div>
                            </div>
                            
                            <div style={{ padding: '0 2rem 2.5rem 2rem' }}>
                                <button 
                                    onClick={() => handleSubscribe(plan.id)} 
                                    disabled={isCurrentPlan || !!subscribingPlanId} 
                                    className={isHighlight || isCurrentPlan ? 'button-primary' : 'button-secondary'}
                                    style={{ width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: '12px', fontWeight: 700 }}
                                >
                                    {isCurrentPlan ? 'Plan Actual' : isSubscribing ? 'Redirigiendo...' : 'Elegir Plan'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

        </div>
    );
};

export default SubscriptionPage;
