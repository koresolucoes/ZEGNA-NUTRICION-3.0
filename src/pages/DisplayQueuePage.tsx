import React, { useState, useEffect, FC, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../supabase';
import { AppointmentWithPerson, QueueDisplay } from '../types';

const DisplayQueuePage: FC = () => {
    const [displayCode, setDisplayCode] = useState<string>('');
    const [inputCode, setInputCode] = useState('');
    const [displayConfig, setDisplayConfig] = useState<QueueDisplay | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [clinicId, setClinicId] = useState<string | null>(null);
    const [appointments, setAppointments] = useState<AppointmentWithPerson[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [userInteracted, setUserInteracted] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Effect to get display code from URL hash
    useEffect(() => {
        const hash = window.location.hash;
        const codeFromHash = hash.split('/')[2];
        if (codeFromHash) {
            setDisplayCode(codeFromHash.toUpperCase());
        }
        const handleHashChange = () => {
            const newHash = window.location.hash;
            const newCode = newHash.split('/')[2];
            setDisplayCode(newCode ? newCode.toUpperCase() : '');
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Effect to fetch display config when code is available
    useEffect(() => {
        if (!displayCode) {
            setDisplayConfig(null);
            setClinicId(null);
            return;
        }
        const fetchDisplayConfig = async () => {
            const { data, error } = await supabase
                .from('queue_displays')
                .select('*, clinics(name, logo_url)')
                .eq('display_code', displayCode)
                .single();
            if (error || !data) {
                setError(`Código de pantalla no válido: ${displayCode}.`);
                setDisplayCode('');
                window.location.hash = '#/fila-virtual';
            } else {
                setDisplayConfig(data as any);
                setClinicId(data.clinic_id);
                setError(null);
            }
        };
        fetchDisplayConfig();
    }, [displayCode]);

    // Effect to fetch appointments and subscribe to realtime changes
    useEffect(() => {
        if (!clinicId) return;

        const fetchAppointments = async () => {
            const today = new Date();
            const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
            
            const { data, error } = await supabase
                .from('appointments')
                .select('*, persons(full_name)')
                .eq('clinic_id', clinicId)
                .gte('start_time', todayStart)
                .in('status', ['called', 'checked-in', 'in-consultation'])
                .order('check_in_time', { ascending: true });

            if (error) {
                setError(`Error al cargar la fila: ${error.message}`);
            } else {
                setAppointments(data as AppointmentWithPerson[] || []);
            }
        };

        fetchAppointments();
        const channel = supabase
            .channel(`display-queue-appointments-${clinicId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `clinic_id=eq.${clinicId}` },
                () => fetchAppointments()
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Realtime subscription started for DisplayQueuePage (clinic: ${clinicId}).`);
                }
                 if (status === 'CLOSED') {
                    console.log(`Realtime subscription closed for DisplayQueuePage (clinic: ${clinicId}).`);
                }
                if (status === 'CHANNEL_ERROR') {
                    console.error(`Realtime subscription error on DisplayQueuePage:`, err);
                }
            });

        return () => { supabase.removeChannel(channel); };
    }, [clinicId]);

    // Effect for the clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    
    // Logic to play sound on new call
    const playSound = useCallback(() => {
        if (userInteracted && audioRef.current) {
            audioRef.current.play().catch(e => console.error("Error playing sound:", e));
        }
    }, [userInteracted]);

    const beingCalled = useMemo(() => appointments.find(a => a.status === 'called'), [appointments]);
    // FIX: The `useRef` hook for `previousCalledId` was called without an initial value, which creates a read-only ref intended for DOM elements. To create a mutable ref for storing a value, an initial value must be provided. I've initialized it with `undefined` to resolve the error and ensure the ref is mutable.
    const previousCalledId = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (beingCalled && beingCalled.id !== previousCalledId.current) {
            playSound();
        }
        previousCalledId.current = beingCalled?.id;
    }, [beingCalled, playSound]);

    // Handler for pairing screen form
    const handleCodeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (inputCode.trim()) {
            window.location.hash = `#/fila-virtual/${inputCode.trim().toUpperCase()}`;
        }
    };

    if (!displayCode || !displayConfig) {
        return (
            <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-lg text-center">
                    <h1 className="text-3xl font-bold mb-2 text-blue-400">zegna nutricion</h1>
                    <h2 className="text-xl font-semibold mb-6">Vincular Pantalla de Espera</h2>
                    <p className="mb-6 text-gray-400">
                        Introduce el código de vinculación único que se encuentra en la sección de configuración de pantallas en tu dashboard.
                    </p>
                    <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
                        <input
                            type="text"
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value)}
                            className="bg-gray-700 border border-gray-600 text-white text-lg text-center font-mono tracking-widest rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="CLIN-CODE"
                            autoFocus
                        />
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md text-lg transition-colors">
                            Vincular
                        </button>
                    </form>
                    {error && <p className="mt-4 text-red-400">{error}</p>}
                </div>
            </div>
        );
    }

    if (!userInteracted) {
        return (
            <div onClick={() => setUserInteracted(true)} className="bg-gray-900 text-white min-h-screen flex items-center justify-center cursor-pointer">
                <div className="text-center p-8">
                    <h1 className="text-4xl font-bold mb-4">Bienvenido a la Sala de Espera</h1>
                    <p className="text-xl text-gray-400">Haz clic en cualquier lugar para habilitar el sonido y comenzar.</p>
                </div>
            </div>
        );
    }

    const inConsultation = appointments.filter(a => a.status === 'in-consultation');
    const waiting = appointments.filter(a => a.status === 'checked-in');
    const clinicData = (displayConfig as any).clinics;

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col lg:flex-row antialiased">
             <audio ref={audioRef} src="https://yjhqvpaxlcjtddjasepb.supabase.co/storage/v1/object/public/files/wait.mp3" preload="auto"></audio>
            {/* Left Panel */}
            <aside className="w-full lg:w-1/3 bg-white text-gray-800 p-8 lg:p-12 flex flex-col justify-center items-center text-center shadow-2xl flex-shrink-0">
                <img 
                    src={clinicData?.logo_url || `https://api.dicebear.com/8.x/initials/svg?seed=${clinicData?.name || 'Z'}&radius=50`}
                    alt="Logo de la clínica"
                    className="w-40 h-40 mb-6 rounded-full object-cover"
                />
                <h1 className="text-4xl font-bold" style={{ color: '#013B6E' }}>ZEGNA NUTRICION</h1>
                <p className="text-lg text-gray-600 mt-2">La diferencia entre bueno y extraordinario.</p>
            </aside>

            {/* Right Panel */}
            <div className="w-full lg:w-2/3 p-8 lg:p-12 flex flex-col">
                <header className="flex justify-between items-baseline mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold text-blue-400">{clinicData?.name || 'Ecosistema Zegna'}</h1>
                    <p className="text-2xl md:text-3xl font-mono text-gray-400">{currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
                </header>

                <main className="flex-1 space-y-10">
                    {/* Llamando a... */}
                    {beingCalled && (
                        <section className="animate-fade-in">
                            <h2 className="text-2xl text-gray-400 font-light tracking-wider mb-4">Llamando a</h2>
                            <div className="p-6 rounded-lg bg-blue-600 animate-pulse-slow">
                                <p className="font-bold truncate text-4xl lg:text-5xl">{beingCalled.persons?.full_name || beingCalled.title}</p>
                                <p className="mt-2 font-semibold text-2xl lg:text-3xl text-blue-200">
                                    {displayConfig.calling_label} {beingCalled.consulting_room}
                                </p>
                            </div>
                        </section>
                    )}

                    {/* En Consulta */}
                    <section>
                        <h2 className="text-2xl text-gray-400 font-light tracking-wider mb-4">En Consulta</h2>
                        {inConsultation.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {inConsultation.map(appt => (
                                    <div key={appt.id} className="p-4 bg-gray-800 rounded-md">
                                        <p className="text-xl font-medium truncate">{appt.persons?.full_name || appt.title}</p>
                                        <p className="text-md text-gray-400">{displayConfig.calling_label} {appt.consulting_room}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 bg-gray-800 rounded-md">
                                <p className="text-lg text-gray-500">No hay pacientes en consulta.</p>
                            </div>
                        )}
                    </section>
                    
                    {/* En Espera */}
                    <section>
                        <h2 className="text-2xl text-gray-400 font-light tracking-wider mb-4">En Espera</h2>
                        {waiting.length > 0 ? (
                            <div className="space-y-3">
                                {waiting.map(appt => (
                                    <div key={appt.id} className="p-4 bg-gray-700/50 rounded-md">
                                        <p className="text-xl font-medium truncate">{appt.persons?.full_name || appt.title}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 bg-gray-800 rounded-md">
                                <p className="text-lg text-gray-500">La sala de espera está vacía.</p>
                            </div>
                        )}
                    </section>
                </main>
            </div>
            
            <style>{`
                .animate-pulse-slow {
                    animation: pulse-slow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                @keyframes pulse-slow {
                    50% {
                        opacity: .75;
                        transform: scale(1.02);
                    }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-in-out;
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default DisplayQueuePage;