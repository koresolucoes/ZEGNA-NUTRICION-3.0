import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 2000, // Aumentamos el límite a 2MB para evitar advertencias en deploy
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                // Separar la librería de Google GenAI que es pesada
                if (id.includes('@google/genai')) {
                  return 'google-genai';
                }
                // Separar Supabase
                if (id.includes('@supabase')) {
                  return 'supabase';
                }
                // Separar React y ReactDOM
                if (id.includes('react') || id.includes('react-dom')) {
                  return 'react-vendor';
                }
                // Separar librerías de PDF
                if (id.includes('html2canvas') || id.includes('jspdf')) {
                  return 'pdf-libs';
                }
                // El resto de dependencias
                return 'vendor';
              }
            }
          }
        }
      }
    };
});