import React, { FC, useState, FormEvent, useEffect, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { useClinic } from '../contexts/ClinicContext';
import { OperatingScheduleItem, Clinic } from '../types';
import { themes, ThemeType } from '../theme'; // Import theme definitions for preview

interface ClinicSettingsPageProps {
    user: User;
    isMobile: boolean;
}

const themeOptions = [
    { id: 'default', name: 'Zegna Oscuro', description: 'Alto contraste, ideal para ambientes con poca luz.' },
    { id: 'light', name: 'Clínico Estándar', description: 'Limpio, brillante y profesional.' },
    { id: 'natural', name: 'Salud Natural', description: 'Tonos verdes y tierra para un enfoque holístico.' },
    { id: 'clinical', name: 'Minimalista Gris', description: 'Sobrio, moderno y sin distracciones.' },
    { id: 'vitality', name: 'Energía Vital', description: 'Alto impacto con tonos cálidos oscuros.' },
];

const fiscalRegimeOptions = [
    { code: '612', name: 'Personas Físicas con Actividades Profesionales y Empresariales' },
    { code: '601', name: 'General de Ley Personas Morales' },
    { code: '626', name: 'Régimen Simplificado de Confianza (RESICO)' },
];

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// --- Subcomponent: Theme Preview Widget ---
const ThemePreview: FC<{ themeKey: string }> = ({ themeKey }) => {
    const theme = themes[themeKey] || themes.default;
    
    return (
        <div style={{
            backgroundColor: theme.backgroundColor,
            color: theme.textColor,
            padding: '1.5rem',
            borderRadius: '12px',
            border: `1px solid ${theme.borderColor}`,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            marginTop: '1rem'
        }}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: `1px solid ${theme.borderColor}`, paddingBottom: '0.5rem'}}>
                <span style={{fontWeight: 600, color: theme.primaryColor}}>Vista Previa</span>
                <span style={{fontSize: '0.8rem', color: theme.textLight}}>Dashboard</span>
            </div>
            
            <div style={{display: 'flex', gap: '1rem'}}>
                <div style={{
                    backgroundColor: theme.surfaceColor,
                    padding: '1rem',
                    borderRadius: '8px',
                    flex: 1,
                    boxShadow: theme.shadow
                }}>
                    <div style={{width: '30px', height: '30px', borderRadius: '50%', backgroundColor: theme.primaryLight, color: theme.primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem'}}>
                        {ICONS.users}
                    </div>
                    <div style={{fontSize: '1.5rem', fontWeight: 700, color: theme.textColor}}>124</div>
                    <div style={{fontSize: '0.8rem', color: theme.textLight}}>Pacientes Activos</div>
                </div>
                
                <div style={{
                    backgroundColor: theme.surfaceColor,
                    padding: '1rem',
                    borderRadius: '8px',
                    flex: 1,
                    boxShadow: theme.shadow
                }}>
                    <div style={{fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem'}}>Próxima Cita</div>
                    <div style={{fontSize: '0.8rem', color: theme.textLight}}>Hoy, 10:00 AM</div>
                    <button style={{
                        backgroundColor: theme.primaryColor,
                        color: '#FFF',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        marginTop: '0.5rem',
                        fontSize: '0.75rem',
                        cursor: 'default'
                    }}>Iniciar</button>
                </div>
            </div>
        </div>
    );
};

const ClinicSettingsPage: FC<ClinicSettingsPageProps> = ({ user, isMobile }) => {
    const { clinic, setClinic } = useClinic();
    const [activeTab, setActiveTab] = useState<'general' | 'theme' | 'schedule' | 'fiscal'>('general');
    
    const [clinicFormData, setClinicFormData] = useState({
        name: '', phone_number: '', email: '', address: '', website: '', logo_url: '', theme: 'default',
        operating_schedule: [] as OperatingScheduleItem[],
        rfc: '',
        fiscal_regime: '',
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [clinicLoading, setClinicLoading] = useState(false);
    const [clinicError, setClinicError] = useState<string | null>(null);
    const [clinicSuccess, setClinicSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (clinic) {
            let schedule: OperatingScheduleItem[] = [];
            if (clinic.operating_schedule && Array.isArray(clinic.operating_schedule) && clinic.operating_schedule.length === 7) {
                schedule = clinic.operating_schedule as OperatingScheduleItem[];
            } else {
                const defaultStart = (clinic.operating_hours_start || '09:00:00').substring(0, 5);
                const defaultEnd = (clinic.operating_hours_end || '18:00:00').substring(0, 5);
                const activeDays = clinic.operating_days || [1, 2, 3, 4, 5];
                schedule = Array.from({ length: 7 }, (_, i) => ({
                    day: i,
                    active: activeDays.includes(i),
                    start: defaultStart,
                    end: defaultEnd
                }));
            }

            setClinicFormData({
                name: clinic.name || '',
                phone_number: clinic.phone_number || '',
                email: clinic.email || '',
                address: clinic.address || '',
                website: clinic.website || '',
                logo_url: clinic.logo_url || '',
                theme: clinic.theme || 'default',
                operating_schedule: schedule,
                rfc: clinic.rfc || '',
                fiscal_regime: clinic.fiscal_regime || '',
            });
            setLogoPreview(clinic.logo_url || null);
        }
    }, [clinic]);
    
    const hasClinicChanges = useMemo(() => {
        if (!clinic) return false;
        
        const scheduleChanged = JSON.stringify(clinicFormData.operating_schedule) !== JSON.stringify(clinic.operating_schedule);
    
        return clinicFormData.name !== (clinic.name || '') ||
               clinicFormData.phone_number !== (clinic.phone_number || '') ||
               clinicFormData.email !== (clinic.email || '') ||
               clinicFormData.address !== (clinic.address || '') ||
               clinicFormData.website !== (clinic.website || '') ||
               clinicFormData.theme !== (clinic.theme || 'default') ||
               clinicFormData.rfc !== (clinic.rfc || '') ||
               clinicFormData.fiscal_regime !== (clinic.fiscal_regime || '') ||
               scheduleChanged ||
               !!logoFile;
    }, [clinic, clinicFormData, logoFile]);

    const handleClinicDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setClinicFormData(prev => ({...prev, [name]: value}));
    };
    
    const handleDayToggle = (dayIndex: number) => {
        setClinicFormData(prev => {
            const newSchedule = [...(prev.operating_schedule || [])];
            if (newSchedule[dayIndex]) {
                newSchedule[dayIndex] = { ...newSchedule[dayIndex], active: !newSchedule[dayIndex].active };
            }
            return { ...prev, operating_schedule: newSchedule };
        });
    };
    
    const handleTimeChange = (dayIndex: number, type: 'start' | 'end', value: string) => {
        setClinicFormData(prev => {
           const newSchedule = [...(prev.operating_schedule || [])];
           if (newSchedule[dayIndex]) {
               newSchedule[dayIndex] = { ...newSchedule[dayIndex], [type]: value };
           }
           return { ...prev, operating_schedule: newSchedule };
       });
   };

     const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleClinicUpdate = async (e: FormEvent) => {
        e.preventDefault();
        if (!clinic || !clinicFormData.name) return;
        setClinicLoading(true);
        setClinicError(null);
        setClinicSuccess(null);

        try {
            let newLogoUrl = clinic.logo_url;
            if (logoFile) {
                const fileExt = logoFile.name.split('.').pop();
                const filePath = `clinic-logos/${clinic.id}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, logoFile, { upsert: true });
                if (uploadError) throw uploadError;
                const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
                newLogoUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`;
            }
            const { data: updatedData, error } = await supabase.from('clinics').update({ 
                name: clinicFormData.name,
                phone_number: clinicFormData.phone_number || null,
                email: clinicFormData.email || null,
                address: clinicFormData.address || null,
                website: clinicFormData.website || null,
                logo_url: newLogoUrl,
                theme: clinicFormData.theme,
                operating_schedule: clinicFormData.operating_schedule,
                rfc: clinicFormData.rfc || null,
                fiscal_regime: clinicFormData.fiscal_regime || null,
            }).eq('id', clinic.id).select().single();
            if (error) throw error;
            if (!updatedData) throw new Error("La actualización falló o no tienes permisos para ver el resultado.");
            setClinic(updatedData as unknown as Clinic);
            setClinicSuccess("¡Configuración actualizada correctamente!");
            setLogoFile(null);
            
            // If theme changed, force a reload of style to ensure context updates immediately visually
             if (clinic.theme !== clinicFormData.theme) {
                 setTimeout(() => window.location.reload(), 500);
             }

        } catch (err: any) {
            setClinicError(err.message);
        } finally {
            setClinicLoading(false);
        }
    };

    const renderTabs = () => (
        <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: '0.5rem', overflowX: isMobile ? 'auto' : 'hidden' }}>
            {[
                { id: 'general', label: 'General', icon: ICONS.home },
                { id: 'theme', label: 'Apariencia', icon: ICONS.sparkles },
                { id: 'schedule', label: 'Horarios', icon: ICONS.calendar },
                { id: 'fiscal', label: 'Fiscal', icon: ICONS.briefcase }
            ].map(tab => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                        textAlign: 'left',
                        padding: '0.75rem 1rem',
                        backgroundColor: activeTab === tab.id ? 'var(--primary-light)' : 'transparent',
                        color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-light)',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        transition: 'all 0.2s'
                    }}
                >
                    <span>{tab.icon}</span>
                    <span style={{whiteSpace: 'nowrap'}}>{tab.label}</span>
                </button>
            ))}
        </div>
    );

    return (
        <div className="fade-in" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '4rem' }}>
            <div style={styles.pageHeader}>
                <h1>Configuración de la Clínica</h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '240px 1fr', gap: '2rem', alignItems: 'start' }}>
                
                {/* Sidebar Navigation */}
                <div style={{
                    backgroundColor: 'var(--surface-color)',
                    padding: '1rem',
                    borderRadius: '12px',
                    position: isMobile ? 'static' : 'sticky',
                    top: '120px',
                    border: '1px solid var(--border-color)'
                }}>
                    {renderTabs()}
                </div>

                {/* Main Content Area */}
                <form id="clinic-form" onSubmit={handleClinicUpdate} style={{ backgroundColor: 'var(--surface-color)', padding: isMobile ? '1.5rem' : '2.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
                    
                    {clinicError && <div style={{...styles.error, marginBottom: '1.5rem'}}>{clinicError}</div>}
                    {clinicSuccess && <div style={{...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)', marginBottom: '1.5rem'}}>{clinicSuccess}</div>}

                    {activeTab === 'general' && (
                        <div className="fade-in">
                            <h2 style={{marginTop: 0, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem'}}>Información General</h2>
                            <div style={{display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '2rem'}}>
                                <div style={{position: 'relative', width: '100px', height: '100px'}}>
                                    <img 
                                        src={logoPreview || `https://api.dicebear.com/8.x/initials/svg?seed=${clinicFormData.name || '?'}&radius=50`} 
                                        alt="Logo" 
                                        style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--surface-hover-color)'}} 
                                    />
                                    <label htmlFor="logo" style={{position: 'absolute', bottom: 0, right: 0, backgroundColor: 'var(--primary-color)', color: 'white', padding: '6px', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'}}>
                                        {ICONS.edit}
                                    </label>
                                    <input id="logo" name="logo" type="file" onChange={handleLogoFileChange} accept="image/*" style={{display: 'none'}} />
                                </div>
                                <div>
                                    <h3 style={{margin: 0}}>{clinicFormData.name || 'Nueva Clínica'}</h3>
                                    <p style={{margin: '0.25rem 0 0 0', color: 'var(--text-light)', fontSize: '0.9rem'}}>Logotipo visible en reportes y portal.</p>
                                </div>
                            </div>

                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
                                <div style={{gridColumn: isMobile ? 'span 2' : 'span 1'}}>
                                    <label htmlFor="name">Nombre de la Clínica *</label>
                                    <input id="name" name="name" type="text" value={clinicFormData.name} onChange={handleClinicDataChange} required />
                                </div>
                                <div style={{gridColumn: isMobile ? 'span 2' : 'span 1'}}>
                                    <label htmlFor="phone_number">Teléfono de Contacto</label>
                                    <input id="phone_number" name="phone_number" type="tel" value={clinicFormData.phone_number} onChange={handleClinicDataChange} />
                                </div>
                                <div style={{gridColumn: isMobile ? 'span 2' : 'span 1'}}>
                                    <label htmlFor="email">Correo Electrónico</label>
                                    <input id="email" name="email" type="email" value={clinicFormData.email} onChange={handleClinicDataChange} />
                                </div>
                                <div style={{gridColumn: isMobile ? 'span 2' : 'span 1'}}>
                                    <label htmlFor="website">Sitio Web</label>
                                    <input id="website" name="website" type="url" value={clinicFormData.website} onChange={handleClinicDataChange} placeholder="https://" />
                                </div>
                                <div style={{gridColumn: 'span 2'}}>
                                    <label htmlFor="address">Dirección Física</label>
                                    <textarea id="address" name="address" value={clinicFormData.address} onChange={handleClinicDataChange} rows={3} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'theme' && (
                        <div className="fade-in">
                            <h2 style={{marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem'}}>Apariencia del Sistema</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '2rem' }}>
                                <div>
                                    <p style={{color: 'var(--text-light)', marginBottom: '1.5rem'}}>Selecciona un tema visual para personalizar tu experiencia y la de tus pacientes.</p>
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                                        {themeOptions.map(theme => {
                                            const isSelected = clinicFormData.theme === theme.id;
                                            const themeDef = themes[theme.id] || themes.default;
                                            return (
                                                <div 
                                                    key={theme.id} 
                                                    onClick={() => setClinicFormData(prev => ({...prev, theme: theme.id}))}
                                                    style={{
                                                        padding: '1rem',
                                                        borderRadius: '8px',
                                                        border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '1rem',
                                                        backgroundColor: isSelected ? 'var(--surface-hover-color)' : 'transparent',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{display: 'flex', gap: '-5px'}}>
                                                        <div style={{width: '24px', height: '24px', borderRadius: '50%', backgroundColor: themeDef.primaryColor, border: '2px solid var(--surface-color)'}}></div>
                                                        <div style={{width: '24px', height: '24px', borderRadius: '50%', backgroundColor: themeDef.accentColor, marginLeft: '-8px', border: '2px solid var(--surface-color)'}}></div>
                                                        <div style={{width: '24px', height: '24px', borderRadius: '50%', backgroundColor: themeDef.backgroundColor, marginLeft: '-8px', border: '2px solid var(--surface-color)'}}></div>
                                                    </div>
                                                    <div>
                                                        <p style={{margin: 0, fontWeight: 600}}>{theme.name}</p>
                                                        <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-light)'}}>{theme.description}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div style={{position: 'sticky', top: '20px'}}>
                                    <h3 style={{fontSize: '1rem', color: 'var(--text-light)', marginBottom: '0.5rem'}}>Vista Previa</h3>
                                    <ThemePreview themeKey={clinicFormData.theme} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'schedule' && (
                         <div className="fade-in">
                            <h2 style={{marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem'}}>Horario de Atención</h2>
                            <p style={{color: 'var(--text-light)', marginBottom: '1.5rem'}}>Define los días y horas en los que tu clínica está abierta. Esto afectará la disponibilidad en la agenda y las respuestas del agente IA.</p>
                            
                            <div style={{backgroundColor: 'var(--surface-hover-color)', borderRadius: '12px', padding: '0.5rem'}}>
                                {dayNames.map((day, index) => {
                                    const scheduleDay = clinicFormData.operating_schedule?.[index];
                                    if (!scheduleDay) return null;
                                    const isDayActive = scheduleDay.active;
                                    return (
                                        <div key={day} style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: isMobile ? 'auto 1fr' : '40px 120px 1fr 1fr', 
                                            gap: '1rem', 
                                            alignItems: 'center', 
                                            padding: '1rem', 
                                            borderRadius: '8px', 
                                            backgroundColor: isDayActive ? 'var(--surface-color)' : 'transparent',
                                            marginBottom: '0.5rem',
                                            border: isDayActive ? '1px solid var(--border-color)' : 'none',
                                            opacity: isDayActive ? 1 : 0.6
                                        }}>
                                            <label className="switch" style={{margin: 0}}>
                                                <input type="checkbox" checked={isDayActive} onChange={() => handleDayToggle(index)} id={`day-toggle-${index}`} />
                                                <span className="slider round"></span>
                                            </label>
                                            <label htmlFor={`day-toggle-${index}`} style={{marginBottom: 0, fontWeight: 600, cursor: 'pointer'}}>{day}</label>
                                            
                                            {isDayActive ? (
                                                <div style={{gridColumn: isMobile ? '1 / -1' : 'auto', display: 'flex', gap: '1rem', alignItems: 'center'}}>
                                                    <input type="time" value={scheduleDay.start} onChange={e => handleTimeChange(index, 'start', e.target.value)} style={{margin: 0}} />
                                                    <span style={{color: 'var(--text-light)'}}>a</span>
                                                    <input type="time" value={scheduleDay.end} onChange={e => handleTimeChange(index, 'end', e.target.value)} style={{margin: 0}} />
                                                </div>
                                            ) : (
                                                <div style={{gridColumn: isMobile ? '1 / -1' : '3 / -1', fontSize: '0.9rem', color: 'var(--text-light)', fontStyle: 'italic'}}>Cerrado</div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'fiscal' && (
                        <div className="fade-in">
                            <h2 style={{marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem'}}>Datos Fiscales</h2>
                             <p style={{color: 'var(--text-light)', marginBottom: '1.5rem'}}>Información requerida para la emisión de facturas (CFDI 4.0).</p>
                            
                            <div style={{display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem'}}>
                                <div>
                                    <label htmlFor="rfc">RFC del Emisor</label>
                                    <input id="rfc" name="rfc" type="text" value={clinicFormData.rfc} onChange={handleClinicDataChange} placeholder="XAXX010101000" />
                                </div>
                                <div>
                                    <label htmlFor="fiscal_regime">Régimen Fiscal</label>
                                    <select id="fiscal_regime" name="fiscal_regime" value={clinicFormData.fiscal_regime} onChange={handleClinicDataChange}>
                                        <option value="">-- Seleccionar --</option>
                                        {fiscalRegimeOptions.map(opt => (
                                            <option key={opt.code} value={opt.code}>
                                                ({opt.code}) {opt.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div style={{marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--primary-light)', borderRadius: '8px', border: '1px solid var(--primary-color)'}}>
                                <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--primary-dark)'}}>
                                    <strong>Nota:</strong> Para configurar los certificados (CSD) y la llave privada para la facturación automática, ve a la sección "Facturación" en el menú principal.
                                </p>
                            </div>
                        </div>
                    )}

                    <div style={{marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end'}}>
                         <button type="submit" disabled={clinicLoading || !hasClinicChanges} style={{minWidth: '150px'}}>
                            {clinicLoading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default ClinicSettingsPage;