import React, { FC, useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { useClinic } from '../../contexts/ClinicContext';
import { Person, Service, PatientServicePlan } from '../../types';

interface PaymentFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    person: Person;
    servicePlans: PatientServicePlan[];
}

const modalRoot = document.getElementById('modal-root');

const PaymentFormModal: FC<PaymentFormModalProps> = ({ isOpen, onClose, onSave, person, servicePlans }) => {
    const { clinic } = useClinic();
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [notes, setNotes] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchServices = async () => {
            if (!clinic) return;
            const { data, error } = await supabase
                .from('services')
                .select('*')
                .eq('clinic_id', clinic.id)
                .eq('is_active', true)
                .order('name');
            if (error) {
                setError(error.message);
            } else {
                setServices(data || []);
            }
        };
        fetchServices();
    }, [clinic]);

    useEffect(() => {
        if (selectedServiceId) {
            const service = services.find(s => s.id === selectedServiceId);
            if (service) {
                setAmount(String(service.price));
            }
        }
    }, [selectedServiceId, services]);
    
    useEffect(() => {
        if (selectedPlanId) {
            const plan = servicePlans.find(p => p.id === selectedPlanId);
            if (plan) {
                setAmount(String(plan.price));
                setNotes(prev => `Pago por Plan: ${plan.name}\n${prev}`);
            }
        } else {
            // If plan is deselected, reset amount if it wasn't a manual service
            if (!selectedServiceId) setAmount('');
        }
    }, [selectedPlanId, servicePlans, selectedServiceId]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!clinic || !amount) return;
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuario no autenticado.");

            const { error } = await supabase.from('payments').insert({
                clinic_id: clinic.id,
                person_id: person.id,
                service_id: selectedServiceId || null,
                recorded_by_user_id: user.id,
                amount: parseFloat(amount),
                payment_method: paymentMethod,
                notes: notes,
                status: 'paid', // Default to paid
            });

            if (error) throw error;
            
            // If a plan was paid for, update the person's subscription
            if (selectedPlanId) {
                const plan = servicePlans.find(p => p.id === selectedPlanId);
                if (plan) {
                    const startDate = new Date();
                    const endDate = new Date();
                    endDate.setDate(startDate.getDate() + plan.duration_days);

                    const { error: personUpdateError } = await supabase
                        .from('persons')
                        .update({
                            current_plan_id: selectedPlanId,
                            subscription_start_date: startDate.toISOString().split('T')[0],
                            subscription_end_date: endDate.toISOString().split('T')[0],
                        })
                        .eq('id', person.id);
                    
                    if (personUpdateError) throw personUpdateError;
                }
            }

            onSave();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit} style={{...styles.modalContent, maxWidth: '500px'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Registrar Cobro para {person.full_name}</h2>
                    <button type="button" onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                <div style={styles.modalBody}>
                    {error && <p style={styles.error}>{error}</p>}
                    
                    <label htmlFor="plan">Pagar Plan de Servicio (Opcional)</label>
                    <select id="plan" value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)}>
                        <option value="">-- Seleccionar un plan --</option>
                        {servicePlans.map(p => <option key={p.id} value={p.id}>{p.name} - ${parseFloat(String(p.price)).toFixed(2)}</option>)}
                    </select>

                    <label htmlFor="service">Servicio (si no es un plan)</label>
                    <select id="service" value={selectedServiceId} onChange={e => { setSelectedServiceId(e.target.value); setSelectedPlanId(''); }}>
                        <option value="">-- Manual / Otro --</option>
                        {services.map(s => <option key={s.id} value={s.id}>{s.name} - ${parseFloat(String(s.price)).toFixed(2)}</option>)}
                    </select>

                    <label htmlFor="amount">Monto a Cobrar*</label>
                    <input id="amount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />

                    <label htmlFor="paymentMethod">Método de Pago*</label>
                    <select id="paymentMethod" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} required>
                        <option value="cash">Efectivo</option>
                        <option value="card">Tarjeta</option>
                        <option value="transfer">Transferencia</option>
                        <option value="other">Otro</option>
                    </select>

                    <label htmlFor="notes">Notas (Opcional)</label>
                    <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} className="button-secondary" disabled={loading}>Cancelar</button>
                    <button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Registrar Cobro'}</button>
                </div>
            </form>
        </div>,
        modalRoot
    );
};

export default PaymentFormModal;
