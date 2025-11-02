import React, { createContext, useContext, useState, useEffect, FC, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { Clinic, NutritionistProfile, ClinicSubscription, Plan } from '../types';
import { styles } from '../constants';
import { applyTheme } from '../theme';

interface ClinicContextType {
    clinic: Clinic | null;
    profile: NutritionistProfile | null;
    role: string | null;
    subscription: (ClinicSubscription & { plans: Plan | null }) | null;
    isLoading: boolean;
    setClinic: React.Dispatch<React.SetStateAction<Clinic | null>>;
    setProfile: React.Dispatch<React.SetStateAction<NutritionistProfile | null>>;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: FC<{ session: Session; children: ReactNode }> = ({ session, children }) => {
    const [clinic, setClinic] = useState<Clinic | null>(null);
    const [profile, setProfile] = useState<NutritionistProfile | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [subscription, setSubscription] = useState<(ClinicSubscription & { plans: Plan | null }) | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!session?.user) {
            setIsLoading(false);
            return;
        }

        const fetchClinicData = async () => {
            setIsLoading(true);
            try {
                const { data: memberData, error: memberError } = await supabase
                    .from('clinic_members')
                    .select('role, clinic_id')
                    .eq('user_id', session.user.id)
                    .single();
                
                if (memberError) {
                    if (memberError.code === 'PGRST116') { console.log("User is not a member of any clinic."); } 
                    else { throw memberError; }
                    setIsLoading(false);
                    return;
                }
                
                setRole(memberData.role);

                const [clinicRes, profileRes, subRes] = await Promise.all([
                     supabase.from('clinics').select('*').eq('id', memberData.clinic_id).single(),
                     supabase.from('nutritionist_profiles').select('*').eq('user_id', session.user.id).single(),
                     supabase.from('clinic_subscriptions').select('*, plans(*)').eq('clinic_id', memberData.clinic_id).single()
                ]);

                if (clinicRes.error) throw clinicRes.error;
                if (profileRes.error && profileRes.error.code !== 'PGRST116') throw profileRes.error;
                if (subRes.error && subRes.error.code !== 'PGRST116') throw subRes.error;


                setClinic(clinicRes.data as Clinic);
                setProfile(profileRes.data);
                setSubscription(subRes.data as any);


            } catch (error: any) {
                console.error("Error fetching clinic data:", error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchClinicData();
    }, [session]);
    
    useEffect(() => {
        applyTheme(clinic?.theme || 'default');
    }, [clinic]);
    
    if (isLoading) {
        return (
             <div style={{ ...styles.authContainer, justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--background-color)' }}>
                <div style={{ textAlign: 'center', color: 'var(--white)' }}>
                    <p style={{fontSize: '1.2rem'}}>Cargando datos de la clínica...</p>
                </div>
            </div>
        );
    }

    if (!clinic && !isLoading) {
        return <OnboardingPage user={session.user} setClinic={setClinic} setRole={setRole} />;
    }

    return (
        <ClinicContext.Provider value={{ clinic, profile, role, subscription, isLoading, setClinic, setProfile }}>
            {children}
        </ClinicContext.Provider>
    );
};

export const useClinic = () => {
    const context = useContext(ClinicContext);
    if (context === undefined) {
        throw new Error('useClinic must be used within a ClinicProvider');
    }
    return context;
};

// Simple onboarding component for new users to create a clinic
const OnboardingPage: FC<{ user: User; setClinic: (clinic: Clinic) => void; setRole: (role: string) => void; }> = ({ user, setClinic, setRole }) => {
    const [formData, setFormData] = useState({
        name: '',
        phone_number: '',
        email: '',
        address: '',
        website: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (user.email) {
            setFormData(prev => ({ ...prev, email: user.email! }));
        }
    }, [user.email]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateClinic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            setError('El nombre de la clínica es obligatorio.');
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const { data: newClinic, error: rpcError } = await supabase.rpc('create_initial_clinic', {
                name: formData.name,
                phone_number: formData.phone_number || null,
                email: formData.email || null,
                address: formData.address || null,
                website: formData.website || null,
            });
            
            if (rpcError) throw rpcError;
            if (!newClinic) throw new Error("No se pudo crear la clínica o la función no devolvió datos.");
            
            setSuccess("¡Clínica creada con éxito! Serás redirigido al dashboard.");

            // Wait a moment to show success message, then update context to trigger re-render
            setTimeout(() => {
                setClinic(newClinic as Clinic);
                setRole('admin');
            }, 1500);

        } catch (err: any) {
            setError(`Error al crear la clínica: ${err.message}`);
            setLoading(false);
        }
    }

    const successMessageStyle: React.CSSProperties = { ...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)' };


    return (
        <div style={styles.authContainer}>
            <div style={{...styles.authBox, maxWidth: '600px', backgroundColor: '#fff', color: '#212529'}} className="fade-in">
                 <div style={styles.header}>
                    <h1 style={styles.title}>¡Bienvenido a Zegna Nutrición!</h1>
                    <p style={{color: '#495057'}}>Para empezar, registra los datos de tu clínica. Podrás invitar a otros miembros más tarde.</p>
                </div>
                {error && <p style={styles.error}>{error}</p>}
                {success && <p style={successMessageStyle}>{success}</p>}
                <form onSubmit={handleCreateClinic}>
                    <label style={styles.label} htmlFor="name">Nombre de tu Clínica *</label>
                    <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} placeholder="Ej: Zegna Nutrición Central" required style={{backgroundColor: '#f1f3f5'}}/>

                    <label style={styles.label} htmlFor="phone_number">Teléfono</label>
                    <input id="phone_number" name="phone_number" type="tel" value={formData.phone_number} onChange={handleChange} placeholder="Teléfono de contacto de la clínica" style={{backgroundColor: '#f1f3f5'}}/>

                    <label style={styles.label} htmlFor="email">Correo Electrónico</label>
                    <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email de contacto de la clínica" style={{backgroundColor: '#f1f3f5'}}/>

                    <label style={styles.label} htmlFor="address">Dirección</label>
                    <textarea id="address" name="address" value={formData.address} onChange={handleChange} rows={2} placeholder="Dirección física de la clínica" style={{backgroundColor: '#f1f3f5'}}/>

                    <label style={styles.label} htmlFor="website">Sitio Web</label>
                    <input id="website" name="website" type="url" value={formData.website} onChange={handleChange} placeholder="https://ejemplo.com" style={{backgroundColor: '#f1f3f5'}}/>
                    
                    <button type="submit" disabled={loading || !!success} style={{width: '100%', marginTop: '1rem'}}>
                        {loading ? 'Creando...' : 'Crear Clínica'}
                    </button>
                </form>
            </div>
        </div>
    );
};