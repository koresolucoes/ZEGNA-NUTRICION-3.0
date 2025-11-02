import React, { FC, useState, FormEvent, useEffect, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { styles } from '../constants';
import { ICONS } from './AuthPage';
import { useClinic } from '../contexts/ClinicContext';
import { OperatingScheduleItem } from '../types';

interface ClinicSettingsPageProps {
    user: User;
    isMobile: boolean;
}

const themeOptions = [
    { id: 'default', name: 'Zegna Azul (Default)', colors: ['#007BFF', '#17A2B8', '#343A40', '#212529'] },
    { id: 'natural', name: 'Salud y Frescura', colors: ['#8FBC8F', '#F4A261', '#3a423a', '#242b24'] },
    { id: 'clinical', name: 'Serenidad Clínica', colors: ['#6A8EAE', '#C5A169', '#383f45', '#272d31'] },
    { id: 'vitality', name: 'Energía y Vitalidad', colors: ['#E57A44', '#48B2A7', '#443d3a', '#2c2826'] },
    { id: 'light', name: 'Minimalista Claro', colors: ['#4A90E2', '#50E3C2', '#FFFFFF', '#F4F6F8'] },
];

const fiscalRegimeOptions = [
    { code: '612', name: 'Personas Físicas con Actividades Profesionales y Empresariales' },
    { code: '601', name: 'General de Ley Personas Morales' },
    { code: '626', name: 'Régimen Simplificado de Confianza (RESICO)' },
];

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const ClinicSettingsPage: FC<ClinicSettingsPageProps> = ({ user, isMobile }) => {
    const { clinic, setClinic } = useClinic();
    
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
            setClinic(updatedData);
            setClinicSuccess("Los datos de la clínica han sido actualizados.");
            setLogoFile(null);
        } catch (err: any) {
            setClinicError(err.message);
        } finally {
            setClinicLoading(false);
        }
    };

    const successMessageStyle: React.CSSProperties = { ...styles.error, backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', borderColor: 'var(--primary-color)' };
    
    return (
        <div className="fade-in" style={{ maxWidth: '1200px', paddingBottom: '7rem' }}>
             <div style={styles.pageHeader}>
                <h1>Configuración de la Clínica</h1>
            </div>
            {clinicError && <p style={styles.error}>{clinicError}</p>}
            {clinicSuccess && <p style={successMessageStyle}>{clinicSuccess}</p>}

             <form id="clinic-form" onSubmit={handleClinicUpdate}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '2rem' }}>
                    {/* Left Column */}
                    <div>
                        <section>
                            <h2>Información General</h2>
                            <div style={{display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '1.5rem'}}>
                                <img src={logoPreview || `https://api.dicebear.com/8.x/initials/svg?seed=${clinicFormData.name || '?'}&radius=50`} alt="Vista previa del logo" style={{width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover'}} />
                                <div style={{flex: 1}}>
                                    <label htmlFor="logo">Logo de la Clínica</label>
                                    <input id="logo" name="logo" type="file" onChange={handleLogoFileChange} accept="image/*" />
                                </div>
                            </div>
                            <label htmlFor="name">Nombre de la Clínica *</label>
                            <input id="name" name="name" type="text" value={clinicFormData.name} onChange={handleClinicDataChange} required />
                            <label htmlFor="phone_number">Teléfono</label>
                            <input id="phone_number" name="phone_number" type="tel" value={clinicFormData.phone_number} onChange={handleClinicDataChange} />
                            <label htmlFor="email">Correo Electrónico</label>
                            <input id="email" name="email" type="email" value={clinicFormData.email} onChange={handleClinicDataChange} />
                            <label htmlFor="address">Dirección</label>
                            <textarea id="address" name="address" value={clinicFormData.address} onChange={handleClinicDataChange} rows={2} />
                            <label htmlFor="website">Sitio Web</label>
                            <input id="website" name="website" type="url" value={clinicFormData.website} onChange={handleClinicDataChange} placeholder="https://ejemplo.com"/>
                        </section>
                        <section style={{marginTop: '2.5rem'}}>
                            <h2>Datos Fiscales (para Facturación)</h2>
                            <label htmlFor="rfc">RFC de la Clínica</label>
                            <input id="rfc" name="rfc" type="text" value={clinicFormData.rfc} onChange={handleClinicDataChange} />
                            
                            <label htmlFor="fiscal_regime">Régimen Fiscal</label>
                            <select id="fiscal_regime" name="fiscal_regime" value={clinicFormData.fiscal_regime} onChange={handleClinicDataChange}>
                                <option value="">-- Seleccionar --</option>
                                {fiscalRegimeOptions.map(opt => (
                                    <option key={opt.code} value={opt.code}>
                                        ({opt.code}) {opt.name}
                                    </option>
                                ))}
                            </select>
                        </section>
                    </div>

                    {/* Right Column */}
                    <div>
                        <section>
                            <h2>Horario de Funcionamiento</h2>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', backgroundColor: 'var(--surface-hover-color)', borderRadius: '8px'}}>
                                {dayNames.map((day, index) => {
                                    const scheduleDay = clinicFormData.operating_schedule?.[index];
                                    if (!scheduleDay) return null;
                                    const isDayActive = scheduleDay.active;
                                    return (
                                        <div key={day} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: '1rem', alignItems: 'center', padding: '0.5rem', borderRadius: '6px', backgroundColor: isDayActive ? 'var(--background-color)' : 'transparent', border: isDayActive ? `1px solid var(--border-color)` : `1px solid transparent` }}>
                                            <label className="switch" style={{margin: 0}}>
                                                <input type="checkbox" checked={isDayActive} onChange={() => handleDayToggle(index)} id={`day-toggle-${index}`} />
                                                <span className="slider round"></span>
                                            </label>
                                            <label htmlFor={`day-toggle-${index}`} style={{marginBottom: 0, fontWeight: isDayActive ? 600 : 400, color: isDayActive ? 'var(--text-color)' : 'var(--text-light)', cursor: 'pointer'}}>{day}</label>
                                            <input type="time" value={scheduleDay.start} onChange={e => handleTimeChange(index, 'start', e.target.value)} disabled={!isDayActive} style={{margin: 0, width: '120px'}} />
                                            <input type="time" value={scheduleDay.end} onChange={e => handleTimeChange(index, 'end', e.target.value)} disabled={!isDayActive} style={{margin: 0, width: '120px'}} />
                                        </div>
                                    )
                                })}
                            </div>
                        </section>
                        <section style={{marginTop: '2.5rem'}}>
                            <h2>Tema del Sistema</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem'}}>
                                {themeOptions.map(theme => {
                                    const isSelected = clinicFormData.theme === theme.id;
                                    return (
                                        <div 
                                            key={theme.id} 
                                            onClick={() => setClinicFormData(prev => ({...prev, theme: theme.id}))}
                                            style={{
                                                padding: '1rem',
                                                borderRadius: '8px',
                                                border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                                cursor: 'pointer',
                                                transition: 'border-color 0.2s, box-shadow 0.2s',
                                                boxShadow: isSelected ? '0 0 0 3px rgba(0, 123, 255, 0.3)' : 'none'
                                            }}
                                        >
                                            <p style={{fontWeight: 600, margin: '0 0 1rem 0'}}>{theme.name}</p>
                                            <div style={{display: 'flex', gap: '0.5rem'}}>
                                                {theme.colors.map((color, i) => <div key={i} style={{width: '30px', height: '30px', borderRadius: '50%', backgroundColor: color}} title={`Color ${i + 1}: ${color}`}></div>)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                </div>
            </form>
            <div style={styles.floatingActions}>
                <button type="submit" form="clinic-form" disabled={clinicLoading || !hasClinicChanges} style={styles.floatingSaveButton} aria-label="Guardar Cambios de la Clínica">
                    {clinicLoading ? '...' : ICONS.save}
                </button>
            </div>
        </div>
    );
};

export default ClinicSettingsPage;