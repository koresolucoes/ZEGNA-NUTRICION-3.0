import React, { useState, useEffect, FC, useRef } from 'react';
// FIX: In Supabase v2, Session and User types are exported via `import type`.
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { ClinicProvider } from './contexts/ClinicContext';
import AuthPage from './pages/AuthPage';
import DashboardLayout from './components/dashboard/DashboardLayout';
import DisplayQueuePage from './pages/DisplayQueuePage';
import SetPasswordPage from './pages/SetPasswordPage';
import PatientPortalLayout from './components/patient_portal/PatientPortalLayout';
import AllyProfileSetupPage from './pages/AllyProfileSetupPage';
import AllyPortalLayout from './components/ally_portal/AllyPortalLayout';

type UserRole = 'member' | 'patient' | 'ally' | null;

const App: FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [userRole, setUserRole] = useState<UserRole>(null);
    const [loading, setLoading] = useState(true);
    const [requiresPasswordSetup, setRequiresPasswordSetup] = useState(false);
    const [requiresAllyProfileSetup, setRequiresAllyProfileSetup] = useState(false);
    
    const sessionRef = useRef(session);
    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    useEffect(() => {
        const determineUserRole = async (user: User): Promise<UserRole> => {
            const { data, error } = await supabase.rpc('get_user_role', { user_id_to_check: user.id });

            if (error) {
                console.error("Error determining user role via RPC:", JSON.stringify(error, null, 2));
                return null;
            }
            return data as UserRole;
        };
        
        const checkAllyProfile = async (userId: string) => {
             const { data: allyProfile, error } = await supabase
                .from('allies')
                .select('specialty')
                .eq('user_id', userId)
                .single();
            if(error && error.code !== 'PGRST116') console.error("Error checking ally profile:", error);
            if (!allyProfile?.specialty) {
                setRequiresAllyProfileSetup(true);
            } else {
                 setRequiresAllyProfileSetup(false);
            }
        }

        const processSession = async (session: Session | null) => {
            setSession(session);
            setUserRole(null);
            setRequiresPasswordSetup(false);
            setRequiresAllyProfileSetup(false);

            if (session?.user) {
                // If the user has invitation metadata, call the RPC to link their account.
                // This is safe to call even if already linked, as the RPC will do nothing.
                if (session.user.user_metadata?.is_patient_invitation) {
                    // FIX: 'link_patient_to_user' is not in the generated types for rpc. Casting to any to bypass the type error.
                    const { error: rpcError } = await (supabase.rpc as any)('link_patient_to_user');
                    if (rpcError) console.error("Error linking invited patient:", rpcError.message);
                }
                
                // Check if they need to set a password (first login from invite/recovery)
                if (window.location.hash.includes('type=invite') || window.location.hash.includes('type=recovery')) {
                    setRequiresPasswordSetup(true);
                }
                
                // Now that the link is potentially made, determine their role.
                const role = await determineUserRole(session.user);
                setUserRole(role);

                // If they are an ally, check if their profile is complete.
                if (role === 'ally') {
                    await checkAllyProfile(session.user.id);
                }
            }
            setLoading(false);
        };

        // Initial session processing on component mount
        // FIX: getSession is an async method on supabase.auth
        supabase.auth.getSession().then(({ data: { session } }) => {
            setLoading(true);
            processSession(session);
        });

        // Listen for auth state changes
        // FIX: onAuthStateChange is a method on supabase.auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            // Only process if the session has actually changed to avoid redundant work
            if (newSession?.access_token !== sessionRef.current?.access_token) {
                setLoading(true);
                processSession(newSession);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const hash = window.location.hash;

    if (hash.startsWith('#/fila-virtual')) {
        return <DisplayQueuePage />;
    }
    
    if (loading) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Cargando...</div>;
    }
    
    // User is logged in and needs to set their password (first time invite or recovery)
    if (session && requiresPasswordSetup) {
        return <SetPasswordPage onPasswordSet={() => {
            setRequiresPasswordSetup(false);
            // Clear the hash from the URL to prevent re-triggering on refresh
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }} />;
    }
    
    // User is an ally and needs to complete their profile
    if(session && requiresAllyProfileSetup) {
        return <AllyProfileSetupPage onProfileComplete={() => setRequiresAllyProfileSetup(false)} />;
    }
    
    // No active session, show the login/signup page
    if (!session) {
        return <AuthPage />;
    }

    // Role-based rendering for specific portals
    if (userRole === 'patient') {
        return <PatientPortalLayout session={session} />;
    }
    
    if (userRole === 'ally') {
        return <AllyPortalLayout session={session} />;
    }
    
    // If the user is authenticated but is not a patient or an ally, they must be
    // a clinic member (or a new user who will become one). The ClinicProvider will
    // handle the logic: it shows the onboarding page for new users without a clinic,
    // or the dashboard for existing members. This fixes the "stuck at login" issue.
    return (
        <ClinicProvider session={session}>
            <DashboardLayout session={session} />
        </ClinicProvider>
    );
};

export default App;