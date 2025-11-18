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
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [clinicId]);

    // Effect for the clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    
    const playSound = useCallback(() => {
        if (userInteracted && audioRef.current) {
            audioRef.current.play().catch(e => console.error("Error playing sound:", e));
        }
    }, [userInteracted]);

    const beingCalled = useMemo(() => appointments.find(a => a.status === 'called'), [appointments]);
    const previousCalledId = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (beingCalled && beingCalled.id !== previousCalledId.current) {
            playSound();
            // Auto-clear "called" status visibility logic could go here if we wanted to hide the overlay after X seconds, 
            // but currently we rely on the doctor changing status to 'in-consultation'
        }
        previousCalledId.current = beingCalled?.id;
    }, [beingCalled, playSound]);

    // Handler for pairing screen form
    const handleCodeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (inputCode.trim()) {
            const code = inputCode.trim().toUpperCase();
            setDisplayCode(code);
            window.location.hash = `#/fila-virtual/${code}`;
        }
    };

    if (!displayCode || !displayConfig) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{background: '#0F172A', color: 'white'}}>
                <div className="w-full max-w-md text-center">
                    <h1 className="text-3xl font-bold mb-2" style={{color: '#38BDF8'}}>Zegna Display</h1>
                    <h2 className="text-xl font-light mb-8 text-gray-400">Configuración de Pantalla</h2>
                    
                    <div className="bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700">
                        <p className="mb-6 text-gray-300">
                            Ingresa el código de vinculación de 8 caracteres generado en el dashboard de tu clínica.
                        </p>
                        <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
                            <input
                                type="text"
                                value={inputCode}
                                onChange={(e) => setInputCode(e.target.value)}
                                className="bg-gray-900 border border-gray-600 text-white text-2xl text-center font-mono tracking-widest rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                                placeholder="XXXX-XXXX"
                                autoFocus
                            />
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-lg text-lg transition-colors mt-2">
                                Vincular Dispositivo
                            </button>
                        </form>
                        {error && <p className="mt-4 text-red-400 bg-red-900/20 p-3 rounded-md border border-red-900">{error}</p>}
                    </div>
                </div>
            </div>
        );
    }

    if (!userInteracted) {
        return (
            <div onClick={() => setUserInteracted(true)} className="min-h-screen flex items-center justify-center cursor-pointer" style={{background: '#0F172A', color: 'white'}}>
                <div className="text-center p-12 animate-pulse">
                    <h1 className="text-5xl font-bold mb-6">Toque para Iniciar</h1>
                    <p className="text-2xl text-gray-400">Activar audio y pantalla completa</p>
                </div>
            </div>
        );
    }

    const inConsultation = appointments.filter(a => a.status === 'in-consultation');
    const waiting = appointments.filter(a => a.status === 'checked-in');
    const clinicData = (displayConfig as any).clinics;

    return (
        <div className="min-h-screen flex flex-col overflow-hidden relative font-sans" style={{background: '#0F172A', color: '#F8FAFC'}}>
             <audio ref={audioRef} src="https://yjhqvpaxlcjtddjasepb.supabase.co/storage/v1/object/public/files/wait.mp3" preload="auto"></audio>
            
            {/* OVERLAY FOR CALLED PATIENT */}
            {beingCalled && (
                <div className="absolute inset-0 z-50 flex items-center justify-center" style={{background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)'}}>
                    <div className="text-center animate-bounce-slow w-full max-w-5xl p-8">
                        <h2 className="text-4xl text-blue-400 font-light tracking-[0.2em] uppercase mb-8">Atención por favor</h2>
                        <div className="bg-white text-gray-900 rounded-3xl p-12 shadow-2xl border-8 border-blue-500">
                             <p className="text-7xl md:text-8xl font-extrabold mb-8 leading-tight text-blue-900">
                                {beingCalled.persons?.full_name || beingCalled.title}
                            </p>
                            <div className="inline-block bg-blue-600 text-white px-12 py-4 rounded-full text-4xl md:text-5xl font-bold shadow-lg">
                                Pasar al {displayConfig.calling_label} {beingCalled.consulting_room}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN DISPLAY LAYOUT */}
            <header className="flex justify-between items-center p-8 bg-gray-800/50 border-b border-gray-700 shadow-md h-32 flex-shrink-0">
                <div className="flex items-center gap-6">
                     {clinicData?.logo_url && (
                        <img src={clinicData.logo_url} alt="Logo" className="h-20 w-20 rounded-full object-cover border-2 border-gray-600" />
                     )}
                     <div>
                        <h1 className="text-3xl font-bold text-white tracking-wide">{clinicData?.name || 'Clínica'}</h1>
                        <p className="text-gray-400 text-lg">Bienvenido</p>
                     </div>
                </div>
                <div className="text-right">
                    <div className="text-5xl font-mono font-bold text-white tracking-widest">
                        {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-xl text-gray-400 mt-1 uppercase tracking-wider">
                        {currentTime.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                </div>
            </header>

            <main className="flex-1 flex p-8 gap-8 overflow-hidden">
                
                {/* Left Column: Active Consultations */}
                <section className="w-1/3 flex flex-col bg-gray-800/30 rounded-3xl border border-gray-700/50 overflow-hidden shadow-lg">
                    <div className="bg-blue-600/20 p-6 border-b border-blue-500/30">
                         <h2 className="text-2xl font-bold text-blue-200 flex items-center gap-3 uppercase tracking-wider">
                             <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></span>
                             Turno Actual
                         </h2>
                    </div>
                    <div className="flex-1 p-6 overflow-y-auto space-y-4">
                        {inConsultation.length > 0 ? inConsultation.map(appt => (
                            <div key={appt.id} className="bg-gray-800 p-6 rounded-2xl border-l-8 border-green-500 shadow-md flex justify-between items-center">
                                <div>
                                    <p className="text-2xl font-bold text-white truncate max-w-[250px]">{appt.persons?.full_name?.split(' ')[0]} {appt.persons?.full_name?.split(' ')[1]}</p>
                                    <p className="text-sm text-gray-400 mt-1">En atención</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{displayConfig.calling_label}</div>
                                    <div className="text-3xl font-bold text-green-400">{appt.consulting_room}</div>
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                                <svg className="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <p className="text-xl">Esperando pacientes...</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Right Column: Waiting List */}
                <section className="w-2/3 flex flex-col bg-gray-800/30 rounded-3xl border border-gray-700/50 overflow-hidden shadow-lg">
                    <div className="bg-gray-700/30 p-6 border-b border-gray-600/30">
                         <h2 className="text-2xl font-bold text-gray-300 uppercase tracking-wider">Próximos Pacientes</h2>
                    </div>
                    <div className="flex-1 p-6 overflow-y-auto">
                        {waiting.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4">
                                {waiting.map((appt, index) => (
                                    <div key={appt.id} className="bg-gray-800/60 p-5 rounded-xl border border-gray-700 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold text-gray-400 text-lg">
                                            {index + 1}
                                        </div>
                                        <p className="text-2xl text-gray-200 font-medium truncate">{appt.persons?.full_name}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="h-full flex items-center justify-center text-gray-500">
                                <p className="text-2xl">La sala de espera está vacía.</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
            
            <footer className="p-4 text-center text-gray-600 text-sm">
                <p>Powered by Zegna Nutrición</p>
            </footer>

            <style>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 2s infinite ease-in-out;
                }
                ::-webkit-scrollbar {
                    width: 8px;
                }
                ::-webkit-scrollbar-track {
                    background: #1e293b; 
                }
                ::-webkit-scrollbar-thumb {
                    background: #475569; 
                    border-radius: 4px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #64748b; 
                }
            `}</style>
        </div>
    );
};

export default DisplayQueuePage;