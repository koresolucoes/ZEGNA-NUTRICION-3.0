

import React from 'react';

const SchemaUpdateNotice = () => (
    <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#fff', margin: '2rem auto', borderRadius: '8px', maxWidth: '650px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h1 style={{color: 'var(--primary-color)'}}>zegna nutricion</h1>
        <h2 style={{color: 'var(--error-color)'}}>Actualización de Base de Datos Requerida</h2>
        <div style={{textAlign: 'left', lineHeight: '1.6', color: 'var(--text-color)'}}>
            <p>
                Tu aplicación está actualizada, pero tu base de datos necesita una pequeña modificación para ser compatible con las nuevas funcionalidades, como la generación de planes con IA.
            </p>
            <p>
                Por favor, sigue estos pasos para resolverlo:
            </p>
            <ol style={{ paddingLeft: '2rem', marginBottom: '1.5rem' }}>
                <li>Inicia sesión en tu cuenta de <a href="https://supabase.com/" target="_blank" rel="noopener noreferrer">Supabase</a>.</li>
                <li>Navega a la sección <strong>SQL Editor</strong> de tu proyecto.</li>
                <li>Copia y pega el siguiente comando SQL en el editor:</li>
            </ol>
            <pre style={{
                backgroundColor: 'var(--background-color)',
                border: '1px solid var(--border-color)',
                padding: '1rem',
                borderRadius: '6px',
                textAlign: 'left',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                color: 'var(--text-color)',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                marginBottom: '1.5rem'
            }}>
                {`ALTER TABLE public.clients ADD COLUMN health_goal TEXT;`}
            </pre>
            <li>Haz clic en el botón "RUN" para ejecutar el comando.</li>
            <li>Una vez completado, <strong>refresca esta página</strong>.</li>
        </div>
        <p style={{textAlign: 'left', lineHeight: '1.6', marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-light)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <strong>Nota:</strong> Este cambio es seguro y no eliminará ningún dato existente. Simplemente añade un nuevo campo para "Objetivo de Salud" a tus pacientes.
        </p>
    </div>
);

export default SchemaUpdateNotice;