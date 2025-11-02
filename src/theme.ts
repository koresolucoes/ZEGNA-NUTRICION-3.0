

// --- Theme Management ---
export const themes = {
    default: {
        '--primary-color': '#007BFF',
        '--primary-light': 'rgba(0, 123, 255, 0.15)',
        '--primary-dark': '#0069D9',
        '--accent-color': '#17A2B8',
        '--background-color': '#212529',
        '--surface-color': '#343A40',
        '--surface-hover-color': '#495057',
        '--border-color': '#495057',
        '--text-color': '#F8F9FA',
        '--text-light': '#CED4DA',
    },
    natural: {
        '--primary-color': '#8FBC8F',
        '--primary-light': 'rgba(143, 188, 143, 0.15)',
        '--primary-dark': '#79a379',
        '--accent-color': '#F4A261',
        '--background-color': '#242b24',
        '--surface-color': '#3a423a',
        '--surface-hover-color': '#4c564c',
        '--border-color': '#4c564c',
        '--text-color': '#F8F9FA',
        '--text-light': '#CED4DA',
    },
    clinical: {
        '--primary-color': '#6A8EAE',
        '--primary-light': 'rgba(106, 142, 174, 0.15)',
        '--primary-dark': '#5a7a99',
        '--accent-color': '#C5A169',
        '--background-color': '#272d31',
        '--surface-color': '#383f45',
        '--surface-hover-color': '#4a535b',
        '--border-color': '#4a535b',
        '--text-color': '#F8F9FA',
        '--text-light': '#CED4DA',
    },
    vitality: {
        '--primary-color': '#E57A44',
        '--primary-light': 'rgba(229, 122, 68, 0.15)',
        '--primary-dark': '#d16a34',
        '--accent-color': '#48B2A7',
        '--background-color': '#2c2826',
        '--surface-color': '#443d3a',
        '--surface-hover-color': '#59504c',
        '--border-color': '#59504c',
        '--text-color': '#F8F9FA',
        '--text-light': '#CED4DA',
    },
    light: {
        '--primary-color': '#4A90E2',
        '--primary-light': 'rgba(74, 144, 226, 0.15)',
        '--primary-dark': '#357ABD',
        '--accent-color': '#50E3C2',
        '--background-color': '#F4F6F8',
        '--surface-color': '#FFFFFF',
        '--surface-hover-color': '#E9ECEF',
        '--border-color': '#DEE2E6',
        '--text-color': '#212529',
        '--text-light': '#6C757D',
    }
};

export const applyTheme = (themeName = 'default') => {
    const theme = themes[themeName as keyof typeof themes] || themes.default;
    for (const variable in theme) {
        document.documentElement.style.setProperty(variable, theme[variable as keyof typeof theme]);
    }
};