
import React, { useState, FormEvent, FC, useEffect } from 'react';
import { supabase } from '../supabase';
import { styles } from '../constants';

// Centralized icons for consistent use across the app
export const ICONS: { [key: string]: React.ReactNode } = {
    activity: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>,
    add: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
    back: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>,
    book: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>,
    briefcase: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
    calculator: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="16" y1="14" x2="8" y2="14"></line><line x1="16" y1="18" x2="8" y2="18"></line><line x1="10" y1="10" x2="14" y2="10"></line></svg>,
    calendar: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
    check: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
    chevronDown: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>,
    clock: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
    clinic: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    close: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
    copy: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
    delete: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>,
    dollar: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
    download: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
    details: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
    edit: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
    feedback: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
    file: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>,
    grid: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
    home: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
    link: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg>,
    list: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
    lock: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
    logout: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>,
    mapPin: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
    menu: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
    phone: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>,
    print: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>,
    save: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>,
    send: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>,
    settings: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
    network: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>,
    sparkles: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L9.5 8.5L4 11L9.5 13.5L12 19L14.5 13.5L20 11L14.5 8.5L12 3Z"/><path d="M3 21L5.5 15.5L11 13L5.5 10.5L3 5"/><path d="M21 21L18.5 15.5L13 13L18.5 10.5L21 5"/></svg>,
    transfer: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="14 9 9 4 4 9"></polyline><path d="M9 20v-10.3A1.7 1.7 0 0 1 10.7 8h0a1.7 1.7 0 0 1 1.7 1.7V20"></path><polyline points="10 15 15 20 20 15"></polyline></svg>,
    user: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
    users: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
};

const AuthPage: FC = () => {
    const [authMode, setAuthMode] = useState<'login' | 'signupClinic' | 'signupAlly' | 'resetPassword' | 'magicLink'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    
    // Responsive state for split screen
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 900);

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 900);
        window.addEventListener('resize', handleResize);
        
        // Check URL params for referrals
        const hash = window.location.hash;
        if (hash.includes('?ref=')) {
            try {
                const params = new URLSearchParams(hash.split('?')[1]);
                const refCode = params.get('ref');
                if (refCode) {
                    setAuthMode('signupClinic');
                    setReferralCode(refCode);
                }
            } catch (e) {
                console.error("Could not parse referral code from URL.", e);
            }
        }
        
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleAuth = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);
    
        try {
            if (authMode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else if (authMode === 'signupClinic' || authMode === 'signupAlly') {
                if (authMode === 'signupAlly' && (!fullName || !specialty)) {
                    throw new Error("El nombre completo y la especialidad son obligatorios para el registro de colaborador.");
                }
    
                const signUpOptions = {
                    email,
                    password,
                    options: {
                        data: authMode === 'signupClinic'
                            ? { referral_code: referralCode.trim() || undefined }
                            : { is_ally_signup: true, full_name: fullName, specialty: specialty }
                    }
                };
    
                const { data, error } = await supabase.auth.signUp(signUpOptions);
    
                if (error) {
                    if (error.message.toLowerCase().includes("user already registered")) {
                        setError("Un usuario con este correo electrónico ya está registrado. Por favor, inicia sesión o recupera tu contraseña.");
                    } else {
                        throw error;
                    }
                } else if (data.user && data.user.identities && data.user.identities.length === 0) {
                    setError("Un usuario con este correo electrónico ya está registrado. Por favor, inicia sesión o recupera tu contraseña.");
                } else {
                    const successMessage = authMode === 'signupClinic'
                        ? 'Se ha enviado un correo de confirmación. Revisa tu bandeja de entrada para activar tu cuenta de clínica.'
                        : 'Se ha enviado un correo de confirmación. Revisa tu bandeja de entrada para activar tu cuenta de colaborador.';
                    setMessage(successMessage);
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handlePasswordReset = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/`,
            });
            if (error) throw error;
            setMessage('Se ha enviado un enlace para restablecer tu contraseña a tu correo electrónico. Revisa tu bandeja de entrada (y la carpeta de spam).');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleMagicLink = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: window.location.origin,
                },
            });
            if (error) throw error;
            setMessage('Se ha enviado un enlace mágico a tu correo. Haz clic en él para iniciar sesión.');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const resetFormState = () => {
        setError(null);
        setMessage(null);
        setAgreedToTerms(false);
        setReferralCode('');
        setFullName('');
        setSpecialty('');
    };

    // --- Inline Styles for White Design ---
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        width: '100%',
        overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    };

    const imageSideStyle: React.CSSProperties = {
        flex: '1',
        background: 'linear-gradient(135deg, #0284C7 0%, #0F172A 100%)', // Ocean to Dark Slate
        display: isDesktop ? 'flex' : 'none',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        padding: '4rem',
        position: 'relative'
    };

    const formSideStyle: React.CSSProperties = {
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        backgroundColor: '#FFFFFF',
        color: '#1E293B'
    };

    const formWrapperStyle: React.CSSProperties = {
        width: '100%',
        maxWidth: '400px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
    };

    const inputNewStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.875rem 1rem',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        backgroundColor: '#F8FAFC',
        fontSize: '1rem',
        color: '#1E293B',
        transition: 'all 0.2s',
        outline: 'none',
        marginTop: '0.5rem'
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '0.9rem',
        fontWeight: 600,
        color: '#475569',
        display: 'block'
    };
    
    const buttonStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.875rem',
        borderRadius: '12px',
        backgroundColor: '#0F172A', // Dark button for contrast
        color: 'white',
        border: 'none',
        fontSize: '1rem',
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        marginTop: '1rem',
        transition: 'background-color 0.2s'
    };

    const secondaryButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: '#FFFFFF',
        color: '#475569',
        border: '1px solid #E2E8F0',
        marginTop: '0.5rem'
    };
    
    const linkStyle: React.CSSProperties = {
        color: '#0284C7',
        textDecoration: 'none',
        fontWeight: 600,
        cursor: 'pointer'
    };

    const pageTitles = {
        login: 'Inicia sesión',
        signupClinic: 'Registra tu clínica',
        signupAlly: 'Únete como colaborador',
        resetPassword: 'Recuperar contraseña',
        magicLink: 'Acceso sin contraseña'
    };
    
    const pageSubtitles = {
        login: 'Ingresa tus credenciales para acceder.',
        signupClinic: 'Comienza gratis hoy mismo.',
        signupAlly: 'Conecta con clínicas y expande tu red.',
        resetPassword: 'Te enviaremos las instrucciones.',
        magicLink: 'Te enviaremos un enlace mágico.'
    };

    return (
        <div style={containerStyle}>
            {/* Left Side - Artwork */}
            {isDesktop && (
                <div style={imageSideStyle}>
                    <div style={{maxWidth: '500px', zIndex: 10}}>
                        <div style={{marginBottom: '2rem', width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', boxShadow: '0 8px 32px rgba(0,0,0,0.1)'}}>
                           🧬
                        </div>
                        <h1 style={{fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.02em'}}>
                            El futuro de tu <span style={{color: '#38BDF8'}}>consultorio nutricional</span>.
                        </h1>
                        <p style={{fontSize: '1.2rem', opacity: 0.9, lineHeight: 1.6, color: '#E2E8F0'}}>
                            Gestiona pacientes, crea planes con IA y automatiza tu agenda en una sola plataforma unificada.
                        </p>
                        
                        {/* Abstract floating cards simulation */}
                         <div style={{marginTop: '4rem', display: 'flex', gap: '1.5rem'}}>
                             <div style={{backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '1.25rem 2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)'}}>
                                 <div style={{fontSize: '2rem', fontWeight: 800}}>15+</div>
                                 <div style={{fontSize: '0.9rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '0.25rem'}}>Herramientas</div>
                             </div>
                             <div style={{backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '1.25rem 2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)'}}>
                                 <div style={{fontSize: '2rem', fontWeight: 800}}>24/7</div>
                                 <div style={{fontSize: '0.9rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '0.25rem'}}>Soporte IA</div>
                             </div>
                         </div>
                    </div>
                    {/* Decorative Elements */}
                    <div style={{position: 'absolute', top: '-20%', left: '-20%', width: '600px', height: '600px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', filter: 'blur(100px)'}}></div>
                    <div style={{position: 'absolute', bottom: '-10%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'rgba(2, 132, 199, 0.15)', filter: 'blur(100px)'}}></div>
                </div>
            )}

            {/* Right Side - Form */}
            <div style={formSideStyle}>
                 <div style={formWrapperStyle}>
                     {/* Header */}
                     <div style={{marginBottom: '2rem'}}>
                         <img src="https://i.imgur.com/NOdUorv.png" alt="Zegna" style={{height: '36px', marginBottom: '2rem', display: 'block'}} />
                         <h2 style={{fontSize: '2rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px'}}>
                             {pageTitles[authMode]}
                         </h2>
                         <p style={{color: '#64748B', margin: 0, fontSize: '1.05rem'}}>
                             {pageSubtitles[authMode]}
                         </p>
                     </div>

                     {/* Messages */}
                     {error && <div style={{backgroundColor: '#FEF2F2', color: '#DC2626', padding: '1rem', borderRadius: '12px', fontSize: '0.9rem', border: '1px solid #FEE2E2'}}>{error}</div>}
                     {message && <div style={{backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '1rem', borderRadius: '12px', fontSize: '0.9rem', border: '1px solid #DBEAFE'}}>{message}</div>}

                     {/* Forms */}
                     {(authMode === 'login' || authMode === 'signupClinic' || authMode === 'signupAlly') && (
                        <form onSubmit={handleAuth} style={{display: 'flex', flexDirection: 'column', gap: '1.25rem'}}>
                            {authMode === 'signupAlly' && (
                                <>
                                    <div>
                                        <label style={labelStyle} htmlFor="full_name">Nombre Completo</label>
                                        <input id="full_name" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required style={inputNewStyle} placeholder="Tu nombre" />
                                    </div>
                                    <div>
                                        <label style={labelStyle} htmlFor="specialty">Especialidad</label>
                                        <input id="specialty" type="text" value={specialty} onChange={e => setSpecialty(e.target.value)} required style={inputNewStyle} placeholder="Ej: Médico General, Entrenador" />
                                    </div>
                                </>
                            )}
                            <div>
                                <label style={labelStyle} htmlFor="email">Correo Electrónico</label>
                                <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputNewStyle} placeholder="nombre@ejemplo.com" />
                            </div>
                            <div>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <label style={labelStyle} htmlFor="password">Contraseña</label>
                                    {authMode === 'login' && (
                                        <span onClick={() => { setAuthMode('resetPassword'); resetFormState(); }} style={{...linkStyle, fontSize: '0.85rem'}} role="button">
                                            ¿Olvidaste tu contraseña?
                                        </span>
                                    )}
                                </div>
                                <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputNewStyle} placeholder="••••••••" />
                            </div>
                            {authMode === 'signupClinic' && (
                                <div>
                                    <label style={labelStyle} htmlFor="referral_code">Código de Referido (Opcional)</label>
                                    <input id="referral_code" type="text" value={referralCode} onChange={e => setReferralCode(e.target.value)} style={inputNewStyle} placeholder="Código promocional" />
                                </div>
                            )}
                            
                            {authMode === 'signupAlly' && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    <input id="terms" type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} required style={{ marginTop: '4px', width: '16px', height: '16px', accentColor: '#0F172A' }} />
                                    <label htmlFor="terms" style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5, fontWeight: 400 }}>
                                        Acepto los <a href="#" style={linkStyle}>Términos</a> y <a href="#" style={linkStyle}>Políticas</a>, y entiendo que mis datos serán visibles en la red Zegna.
                                    </label>
                                </div>
                            )}

                            <button type="submit" style={buttonStyle} disabled={loading || (authMode === 'signupAlly' && !agreedToTerms)}>
                                {loading ? 'Procesando...' : authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                            </button>

                            {authMode === 'login' && (
                                <button type="button" onClick={() => { setAuthMode('magicLink'); resetFormState(); }} style={secondaryButtonStyle}>
                                    Ingresar con enlace mágico
                                </button>
                            )}
                        </form>
                     )}

                    {(authMode === 'resetPassword' || authMode === 'magicLink') && (
                        <form onSubmit={authMode === 'resetPassword' ? handlePasswordReset : handleMagicLink} style={{display: 'flex', flexDirection: 'column', gap: '1.25rem'}}>
                            <div>
                                <label style={labelStyle} htmlFor="email">Correo Electrónico</label>
                                <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputNewStyle} placeholder="nombre@ejemplo.com" />
                            </div>
                            <button type="submit" style={buttonStyle} disabled={loading}>
                                {loading ? 'Enviando...' : 'Enviar enlace'}
                            </button>
                            <button type="button" onClick={() => { setAuthMode('login'); resetFormState(); }} style={{...secondaryButtonStyle, border: 'none', color: '#64748B'}}>
                                Volver al inicio de sesión
                            </button>
                        </form>
                    )}

                    {/* Footer Links */}
                    {(authMode === 'login' || authMode === 'signupClinic' || authMode === 'signupAlly') && (
                        <div style={{marginTop: '1.5rem', textAlign: 'center', fontSize: '0.95rem', color: '#64748B'}}>
                            {authMode === 'login' ? (
                                <>
                                    ¿Aún no tienes cuenta? <span onClick={() => { setAuthMode('signupClinic'); resetFormState(); }} style={linkStyle} role="button">Regístrate gratis</span>
                                    <div style={{marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #E2E8F0'}}>
                                        <p style={{margin: 0, fontSize: '0.9rem'}}>¿Eres un profesional colaborador?</p>
                                        <span onClick={() => { setAuthMode('signupAlly'); resetFormState(); }} style={{...linkStyle, color: '#0F766E'}} role="button">Únete a la red aquí</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    ¿Ya tienes una cuenta? <span onClick={() => { setAuthMode('login'); resetFormState(); }} style={linkStyle} role="button">Inicia Sesión</span>
                                </>
                            )}
                        </div>
                    )}
                 </div>
            </div>
        </div>
    )
}

export default AuthPage;
