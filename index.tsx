import React from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './src/supabase';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");
const root = createRoot(rootElement);

// This check is now robust. If credentials are not set, `supabase` is null,
// and the app will not attempt to render, preventing crashes.
if (!supabase) {
    root.render(
      <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#1F2937', color: '#E9ECEF', margin: '2rem auto', borderRadius: '8px', maxWidth: '600px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h1 style={{color: 'var(--primary-color)'}}>Zegna Nutrición</h1>
        <h2>Configuración Requerida</h2>
        <p style={{textAlign: 'left', lineHeight: '1.6'}}>Para que la aplicación funcione, necesitas configurar tu base de datos de Supabase. Sigue estos pasos:</p>
        <ol style={{textAlign: 'left', lineHeight: '1.6', paddingLeft: '2rem', marginTop: '1rem'}}>
            <li style={{marginBottom: '0.5rem'}}>Abre el archivo <code>src/supabase.ts</code> en tu editor de código.</li>
            <li style={{marginBottom: '0.5rem'}}>Reemplaza los valores de <code>supabaseUrl</code> y <code>supabaseKey</code> con las credenciales de tu proyecto de Supabase.</li>
            <li style={{marginBottom: '0.5rem'}}>Copia <strong>todo el script SQL</strong> que se encuentra dentro del archivo <code>src/supabase.ts</code>.</li>
            <li style={{marginBottom: '0.5rem'}}>Ve al "SQL Editor" en tu dashboard de Supabase y pega el script completo.</li>
            <li style={{marginBottom: '0.5rem'}}>Ejecuta el script. Una vez que termine, refresca esta página.</li>
        </ol>
      </div>
    );
} else {
    // We dynamically import the App component only when credentials are valid.
    // This prevents its code (and its use of the Supabase client) from running prematurely.
    import('./src/App').then(({ default: App }) => {
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    });
}