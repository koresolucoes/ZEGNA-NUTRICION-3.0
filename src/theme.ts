
import { createGlobalStyle } from 'styled-components';

// Definición de Tipos para el Tema
export interface ThemeType {
    primaryColor: string;
    primaryLight: string;
    primaryDark: string;
    accentColor: string;
    backgroundColor: string;
    surfaceColor: string;
    surfaceHoverColor: string;
    surfaceActive: string;
    textColor: string;
    textLight: string;
    borderColor: string;
    errorColor: string;
    errorBg: string;
    shadow: string;
    shadowHover: string;
    white: string;
}

export const themes: { [key: string]: ThemeType } = {
    default: { 
        // "Zegna Azul (Dark Mode)" - El default original
        primaryColor: '#38BDF8', 
        primaryLight: 'rgba(56, 189, 248, 0.1)',
        primaryDark: '#0EA5E9', 
        accentColor: '#2DD4BF', 
        
        backgroundColor: '#0F172A', 
        surfaceColor: '#1E293B', 
        surfaceHoverColor: '#334155', 
        surfaceActive: '#475569', 
        
        textColor: '#F1F5F9', 
        textLight: '#94A3B8', 
        
        borderColor: '#334155', 
        
        errorColor: '#F87171', 
        errorBg: 'rgba(248, 113, 113, 0.1)',
        
        shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        shadowHover: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
        
        white: '#FFFFFF',
    },
    light: { 
        // "Zegna Azul (Light Mode)"
        primaryColor: '#0284C7', 
        primaryLight: '#E0F2FE', 
        primaryDark: '#0C4A6E', 
        accentColor: '#0F766E', 
        
        backgroundColor: '#F8FAFC', 
        surfaceColor: '#FFFFFF', 
        surfaceHoverColor: '#F1F5F9', 
        surfaceActive: '#E2E8F0', 
        
        textColor: '#0F172A', 
        textLight: '#64748B', 
        
        borderColor: '#E2E8F0', 
        
        errorColor: '#EF4444', 
        errorBg: '#FEF2F2', 
        
        shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)', 
        shadowHover: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.1)', 
        
        white: '#FFFFFF',
    },
    natural: {
        // "Salud y Frescura" - Verdes y Tierras
        primaryColor: '#16A34A', // Green 600
        primaryLight: '#DCFCE7', // Green 100
        primaryDark: '#14532D', // Green 900
        accentColor: '#D97706', // Amber 600
        
        backgroundColor: '#FAFAF9', // Stone 50
        surfaceColor: '#FFFFFF',
        surfaceHoverColor: '#F5F5F4', // Stone 100
        surfaceActive: '#E7E5E4', // Stone 200
        
        textColor: '#1C1917', // Stone 900
        textLight: '#78716C', // Stone 500
        
        borderColor: '#E7E5E4', // Stone 200
        
        errorColor: '#DC2626',
        errorBg: '#FEF2F2',
        
        shadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
        shadowHover: '0 4px 6px -1px rgba(0,0,0,0.1)',
        
        white: '#FFFFFF',
    },
    clinical: {
        // "Serenidad Clínica" - Azules grisáceos y dorados apagados
        primaryColor: '#475569', // Slate 600
        primaryLight: '#F1F5F9', // Slate 100
        primaryDark: '#0F172A', // Slate 900
        accentColor: '#0891B2', // Cyan 600
        
        backgroundColor: '#FFFFFF',
        surfaceColor: '#F8FAFC', // Slate 50
        surfaceHoverColor: '#E2E8F0', // Slate 200
        surfaceActive: '#CBD5E1', // Slate 300
        
        textColor: '#334155', // Slate 700
        textLight: '#94A3B8', // Slate 400
        
        borderColor: '#CBD5E1',
        
        errorColor: '#BE123C', // Rose 700
        errorBg: '#FFF1F2',
        
        shadow: 'none',
        shadowHover: '0 1px 2px 0 rgba(0,0,0,0.05)',
        
        white: '#FFFFFF',
    },
    vitality: {
        // "Energía y Vitalidad" - Naranjas y Grises oscuros
        primaryColor: '#EA580C', // Orange 600
        primaryLight: '#FFEDD5', // Orange 100
        primaryDark: '#9A3412', // Orange 800
        accentColor: '#0D9488', // Teal 600
        
        backgroundColor: '#171717', // Neutral 900
        surfaceColor: '#262626', // Neutral 800
        surfaceHoverColor: '#404040', // Neutral 700
        surfaceActive: '#525252', // Neutral 600
        
        textColor: '#FAFAFA', // Neutral 50
        textLight: '#A3A3A3', // Neutral 400
        
        borderColor: '#404040',
        
        errorColor: '#EF4444',
        errorBg: 'rgba(239, 68, 68, 0.1)',
        
        shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
        shadowHover: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
        
        white: '#FFFFFF',
    }
};

export const GlobalStyle = createGlobalStyle<{ theme: ThemeType }>`
    :root {
        --primary-color: ${({ theme }) => theme.primaryColor};
        --primary-light: ${({ theme }) => theme.primaryLight};
        --primary-dark: ${({ theme }) => theme.primaryDark};
        --accent-color: ${({ theme }) => theme.accentColor};
        
        --text-color: ${({ theme }) => theme.textColor};
        --text-light: ${({ theme }) => theme.textLight};
        
        --background-color: ${({ theme }) => theme.backgroundColor};
        --surface-color: ${({ theme }) => theme.surfaceColor};
        --surface-hover-color: ${({ theme }) => theme.surfaceHoverColor};
        --surface-active: ${({ theme }) => theme.surfaceActive};
        
        --border-color: ${({ theme }) => theme.borderColor};
        
        --error-color: ${({ theme }) => theme.errorColor};
        --error-bg: ${({ theme }) => theme.errorBg};
        
        --shadow: ${({ theme }) => theme.shadow};
        --shadow-hover: ${({ theme }) => theme.shadowHover};
        --white: ${({ theme }) => theme.white};
        
        --radius-sm: 6px;
        --radius-md: 12px;
        --radius-lg: 16px;
        
        --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        
        /* Typography Scale */
        --font-xs: 0.75rem;
        --font-sm: 0.875rem;
        --font-base: 1rem;
        --font-lg: 1.125rem;
        --font-xl: 1.25rem;
        --font-2xl: 1.5rem;
    }

    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
    }

    html, body {
        height: 100%;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        background-color: var(--background-color);
        color: var(--text-color);
        line-height: 1.5;
        font-size: 15px; 
    }

    #root {
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    /* Custom Scrollbar */
    ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }

    ::-webkit-scrollbar-track {
        background: var(--background-color);
    }

    ::-webkit-scrollbar-thumb {
        background: var(--surface-active);
        border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
        background: var(--text-light);
    }

    h1, h2, h3, h4, h5, h6 {
        font-weight: 600;
        letter-spacing: -0.025em;
        margin-bottom: 0.5em;
        color: var(--text-color);
    }

    /* Modern Inputs */
    input, textarea, select {
        width: 100%;
        padding: 0.75rem 1rem;
        margin-bottom: 1.25rem;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-sm);
        font-size: var(--font-base);
        background-color: var(--surface-color);
        color: var(--text-color);
        transition: var(--transition);
        
        &:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px var(--primary-light);
        }
        
        &::placeholder {
            color: var(--text-light);
            opacity: 0.7;
        }
        
        &:disabled {
            background-color: var(--surface-hover-color);
            cursor: not-allowed;
            opacity: 0.7;
        }
    }

    label {
        display: block;
        margin-bottom: 0.375rem;
        font-weight: 500;
        font-size: var(--font-sm);
        color: var(--text-color);
    }

    /* Buttons */
    button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.625rem 1.25rem;
        border: none;
        border-radius: var(--radius-sm);
        background-color: var(--primary-color);
        color: #ffffff;
        font-weight: 500;
        font-size: var(--font-sm);
        cursor: pointer;
        transition: var(--transition);
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

        &:hover:not(:disabled) {
            background-color: var(--primary-dark);
            transform: translateY(-1px);
        }

        &:active:not(:disabled) {
            transform: translateY(0);
        }

        &:disabled {
            background-color: var(--text-light);
            cursor: not-allowed;
            opacity: 0.5;
            transform: none;
        }

        &.button-secondary {
            background-color: var(--surface-color);
            color: var(--text-color);
            border: 1px solid var(--border-color);
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

            &:hover:not(:disabled) {
                background-color: var(--surface-hover-color);
                border-color: var(--text-light);
            }
        }

        &.button-danger {
            background-color: var(--error-bg);
            color: var(--error-color);
            border: 1px solid transparent;
            box-shadow: none;
            
            &:hover:not(:disabled) {
                background-color: var(--error-color);
                color: white;
            }
        }
    }
    
    /* Utility Classes */
    .fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    
    /* Tables */
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-weight: 600; font-size: var(--font-xs); text-transform: uppercase; color: var(--text-light); letter-spacing: 0.05em; }
`;
