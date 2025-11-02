import { createGlobalStyle } from 'styled-components';

export const themes = {
    default: {
        primaryColor: '#2563EB', // Darker blue for better contrast with white text
        primaryLight: 'rgba(37, 99, 235, 0.1)',
        primaryDark: '#1D4ED8', // Even darker blue
        accentColor: '#F59E0B', // Switched to amber for better contrast as text
        textColor: '#E5E7EB',
        textLight: '#9CA3AF',
        backgroundColor: '#1F2937',
        surfaceColor: '#374151',
        surfaceHoverColor: '#4B5563',
        white: '#fff',
        borderColor: '#4B5563',
        errorColor: '#EF4444',
        errorBg: 'rgba(239, 68, 68, 0.1)',
    },
    natural: {
        primaryColor: '#2E7D32', // Darker green for accessible buttons
        primaryLight: 'rgba(46, 125, 50, 0.15)',
        primaryDark: '#1B5E20',
        accentColor: '#F4A261',
        backgroundColor: '#242b24',
        surfaceColor: '#3a423a',
        surfaceHoverColor: '#4c564c',
        borderColor: '#4c564c',
        textColor: '#F8F9FA',
        textLight: '#CED4DA',
        white: '#fff',
        errorColor: '#EF4444',
        errorBg: 'rgba(239, 68, 68, 0.1)',
    },
    clinical: {
        primaryColor: '#546E7A', // Darker blue-gray for accessible buttons
        primaryLight: 'rgba(84, 110, 122, 0.15)',
        primaryDark: '#455A64',
        accentColor: '#C5A169',
        backgroundColor: '#272d31',
        surfaceColor: '#383f45',
        surfaceHoverColor: '#4a535b',
        borderColor: '#4a535b',
        textColor: '#F8F9FA',
        textLight: '#CED4DA',
        white: '#fff',
        errorColor: '#EF4444',
        errorBg: 'rgba(239, 68, 68, 0.1)',
    },
    vitality: {
        primaryColor: '#D84315', // Darker orange for accessible buttons
        primaryLight: 'rgba(216, 67, 21, 0.15)',
        primaryDark: '#BF360C',
        accentColor: '#26A69A', // Brighter teal for better contrast
        backgroundColor: '#2c2826',
        surfaceColor: '#443d3a',
        surfaceHoverColor: '#59504c',
        borderColor: '#59504c',
        textColor: '#F8F9FA',
        textLight: '#CED4DA',
        white: '#fff',
        errorColor: '#EF4444',
        errorBg: 'rgba(239, 68, 68, 0.1)',
    },
    light: {
        primaryColor: '#2563EB', // Darker blue for accessible buttons
        primaryLight: 'rgba(37, 99, 235, 0.1)',
        primaryDark: '#1D4ED8',
        accentColor: '#50E3C2',
        backgroundColor: '#F4F6F8',
        surfaceColor: '#FFFFFF',
        surfaceHoverColor: '#E9ECEF',
        borderColor: '#DEE2E6',
        textColor: '#212529',
        textLight: '#6C757D',
        white: '#fff',
        errorColor: '#EF4444',
        errorBg: 'rgba(239, 68, 68, 0.1)',
    }
};

type Theme = typeof themes.default;

export const GlobalStyle = createGlobalStyle<{ theme: Theme }>`
    /* General styles */
    body * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }

    html {
        height: 100%;
    }

    body {
        font-family: 'Inter', sans-serif;
        background-color: ${({ theme }) => theme.backgroundColor};
        color: ${({ theme }) => theme.textColor};
        line-height: 1.5;
        min-height: 100vh;
        overflow-x: hidden;
    }

    #root {
        width: 100%;
        height: 100%;
    }
    
    .patient-portal-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 1.5rem;
    }

    @media (max-width: 960px) {
        .patient-portal-grid {
            grid-template-columns: 1fr;
        }
    }
    
    .widget-card {
        background-color: ${({ theme }) => theme.surfaceColor};
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .widget-header {
        padding: 1rem 1.25rem;
        border-bottom: 1px solid ${({ theme }) => theme.borderColor};
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .widget-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: ${({ theme }) => theme.textColor};
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .widget-body {
        padding: 1.25rem;
    }
    
    .progress-bar-bg {
        background-color: ${({ theme }) => theme.backgroundColor};
        border-radius: 8px;
        height: 12px;
        overflow: hidden;
    }

    .progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, ${({ theme }) => theme.primaryDark}, ${({ theme }) => theme.primaryColor});
        border-radius: 8px;
        transition: width 0.5s ease-in-out;
    }

    body input, body textarea, body select {
        width: 100%;
        padding: 12px 15px;
        margin-bottom: 1rem;
        border: 1px solid ${({ theme }) => theme.borderColor};
        border-radius: 8px;
        font-size: 1rem;
        font-family: 'Inter', sans-serif;
        transition: border-color 0.2s, box-shadow 0.2s;
        background-color: ${({ theme }) => theme.surfaceColor};
        color: ${({ theme }) => theme.textColor};
    }
    
    body input[type=number]::-webkit-inner-spin-button,
    body input[type=number]::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    body input[type=number] {
        -moz-appearance: textfield;
    }
    
    body input::placeholder, body textarea::placeholder {
        color: ${({ theme }) => theme.textLight};
        opacity: 1;
    }

    body input:focus, body textarea:focus, body select:focus {
        outline: none;
        border-color: ${({ theme }) => theme.primaryColor};
        box-shadow: 0 0 0 3px ${({ theme }) => theme.primaryColor}4D;
    }
    
    body label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: ${({ theme }) => theme.textLight};
        font-size: 0.9rem;
    }
    
    body button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        background-color: ${({ theme }) => theme.primaryColor};
        color: ${({ theme }) => theme.white};
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s, transform 0.1s, box-shadow 0.2s;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }

    body button:hover {
        background-color: ${({ theme }) => theme.primaryDark};
        box-shadow: 0 4px 8px rgba(0,0,0,0.25);
    }

    body button:active {
        transform: scale(0.98);
    }

    body button:disabled {
        background-color: #555;
        color: #999;
        cursor: not-allowed;
        box-shadow: none;
    }

    body button.button-secondary {
        background-color: ${({ theme }) => theme.surfaceHoverColor};
        color: ${({ theme }) => theme.textColor};
        border: 1px solid ${({ theme }) => theme.borderColor};
    }

    body button.button-secondary:hover {
        background-color: ${({ theme }) => theme.borderColor};
    }
    
    body button.button-danger {
        background-color: ${({ theme }) => theme.errorBg};
        color: ${({ theme }) => theme.errorColor};
        border: 1px solid ${({ theme }) => theme.errorColor};
    }
    
    body button.button-danger:hover {
        background-color: ${({ theme }) => theme.errorColor};
        color: ${({ theme }) => theme.white};
    }

    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
    }

    .fade-in {
        animation: fadeIn 0.4s ease-in-out;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    @keyframes spin { 
        0% { transform: rotate(0deg); } 
        100% { transform: rotate(360deg); } 
    }
    
    .nav-item-hover:hover {
        background-color: ${({ theme }) => theme.primaryLight} !important;
        color: ${({ theme }) => theme.primaryColor} !important;
    }
    
    .table-row-hover:hover {
         background-color: ${({ theme }) => theme.surfaceHoverColor};
    }

    .card-hover:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 20px rgba(0,0,0,0.25);
    }

    .dashboard-grid {
        grid-template-columns: repeat(4, 1fr);
    }
    @media (max-width: 1200px) {
        .dashboard-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
        .dashboard-grid { grid-template-columns: repeat(2, 1fr); }
    }
    
    .summary-card-value {
        transition: color 0.2s;
    }
    .card-hover:hover .summary-card-value {
         color: ${({ theme }) => theme.primaryColor};
    }
    
    .tabs {
        display: flex;
        overflow-x: auto;
        border-bottom: 2px solid ${({ theme }) => theme.borderColor};
        margin-bottom: 1.5rem;
        scrollbar-width: thin;
        scrollbar-color: ${({ theme }) => theme.primaryColor} ${({ theme }) => theme.backgroundColor};
    }
    
    .tabs::-webkit-scrollbar,
    .sub-tabs::-webkit-scrollbar,
    .hide-scrollbar::-webkit-scrollbar {
        display: none;
    }
    
    .tabs,
    .sub-tabs,
    .hide-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .tab-button {
        padding: 0.8rem 1.2rem;
        border: none;
        border-bottom: 3px solid transparent;
        background-color: transparent;
        color: ${({ theme }) => theme.textLight};
        cursor: pointer;
        font-size: 1rem;
        font-weight: 500;
        transition: all 0.2s ease-in-out;
        white-space: nowrap;
    }

    .tab-button:hover {
        background-color: ${({ theme }) => theme.primaryLight};
        color: ${({ theme }) => theme.primaryColor};
    }

    .tab-button.active {
        color: ${({ theme }) => theme.primaryColor};
        border-bottom-color: ${({ theme }) => theme.primaryColor};
        font-weight: 600;
    }
    
    .sub-tabs {
        display: flex;
        overflow-x: auto;
        border-bottom: 1px solid ${({ theme }) => theme.borderColor};
        margin-bottom: 1.5rem;
    }

    .sub-tab-button {
        padding: 0.6rem 1rem;
        border: none;
        border-bottom: 2px solid transparent;
        background-color: transparent;
        color: ${({ theme }) => theme.textLight};
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: 500;
        transition: all 0.2s ease-in-out;
        white-space: nowrap;
    }

    .sub-tab-button:hover {
        background-color: ${({ theme }) => theme.surfaceHoverColor};
        color: ${({ theme }) => theme.primaryColor};
    }

    .sub-tab-button.active {
        color: ${({ theme }) => theme.primaryColor};
        border-bottom-color: ${({ theme }) => theme.primaryColor};
        font-weight: 600;
    }
    
    .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem;
    }
    
    .info-card {
        background-color: ${({ theme }) => theme.surfaceColor};
        border-radius: 8px;
        padding: 1rem;
        border: 1px solid ${({ theme }) => theme.borderColor};
        transition: box-shadow 0.2s, border-color 0.2s;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .info-card-clickable {
        cursor: pointer;
    }

    .info-card-clickable:hover {
        border-color: ${({ theme }) => theme.primaryColor};
        box-shadow: 0 4px 12px ${({ theme }) => theme.primaryColor}1A;
    }
    
    .card-actions {
        display: flex;
        gap: 0.25rem;
        opacity: 0;
        transition: opacity 0.2s;
    }

    .info-card:hover .card-actions {
        opacity: 1;
    }
    
    @media (max-width: 768px) {
        .patient-portal-header-content {
            padding: 0.75rem 1rem;
        }
        .patient-portal-header h1 {
            font-size: 1.2rem;
        }
        .user-info-desktop {
            display: none;
        }
    }
    
    @media (max-width: 959px) {
        .summary-tabs {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }
        .summary-tab-button {
            background-color: ${({ theme }) => theme.surfaceColor};
            border: 1px solid ${({ theme }) => theme.borderColor};
            color: ${({ theme }) => theme.textColor};
            padding: 1rem;
            border-radius: 8px;
            font-weight: 600;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
            white-space: normal;
        }
        .summary-tab-button:hover {
            background-color: ${({ theme }) => theme.surfaceHoverColor};
            border-color: ${({ theme }) => theme.primaryColor};
        }
        .summary-tab-button.active {
            background-color: ${({ theme }) => theme.primaryColor};
            color: ${({ theme }) => theme.white};
            border-color: ${({ theme }) => theme.primaryColor};
            box-shadow: 0 4px 8px ${({ theme }) => theme.primaryColor}33;
        }
    }
    
    .actions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
    }

    @media (max-width: 600px) {
        .actions-grid {
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
    }

    .action-card {
        background-color: ${({ theme }) => theme.surfaceColor};
        border: 1px solid ${({ theme }) => theme.borderColor};
        color: ${({ theme }) => theme.textColor};
        padding: 1.5rem 1rem;
        border-radius: 12px;
        font-weight: 600;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease-in-out;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        min-height: 120px;
    }
    .action-card:hover {
        background-color: ${({ theme }) => theme.surfaceHoverColor};
        border-color: ${({ theme }) => theme.primaryColor};
        color: ${({ theme }) => theme.primaryColor};
        transform: translateY(-3px);
        box-shadow: 0 6px 12px rgba(0,0,0,0.2);
    }
    .action-card svg {
        width: 24px;
        height: 24px;
        transition: color 0.2s;
    }

    @media print {
        body * {
            visibility: hidden;
        }
        #printable-area, #printable-area * {
            visibility: visible;
        }
        #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
        }
    }

    .category-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        text-align: left;
        background: none;
        border: none;
        color: ${({ theme }) => theme.textColor};
    }
    .category-chevron {
        transition: transform 0.3s ease;
        transform: rotate(-90deg);
    }
    .category-chevron.open {
        transform: rotate(0deg);
    }
    .submenu-container {
        overflow: hidden;
        animation: slide-down 0.4s ease-out;
        padding-left: 1rem;
    }
    @keyframes slide-down {
        from {
            opacity: 0;
            max-height: 0;
        }
        to {
            opacity: 1;
            max-height: 500px;
        }
    }
    .nav-sub-item {
        padding-left: 2.25rem !important;
    }
`;