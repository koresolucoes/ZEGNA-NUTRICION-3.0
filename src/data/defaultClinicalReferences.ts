import { ClinicalReference } from '../types';

export const defaultClinicalReferences: ClinicalReference[] = [
    {
        id: 'default-diabetes-ada',
        title: 'Criterios Diabetes (ADA 2024)',
        category: 'Metabólico',
        source: 'American Diabetes Association',
        icon_svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 16a1 1 0 1 1 1-1 1 1 0 0 1-1 1zm1-5.16V14a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1 1.5 1.5 0 1 0-1.5-1.5 1 1 0 0 1-2 0 3.5 3.5 0 1 1 4 2.66z"></path></svg>',
        linked_tool: 'diabetes',
        clinic_id: null,
        created_at: new Date().toISOString(),
        user_id: null,
        content: [
            { label: 'Normal (Ayuno)', value: '< 100 mg/dL', key: 'glucose_mg_dl', check: 'high', threshold: 100 },
            { label: 'Prediabetes (Ayuno)', value: '100 - 125 mg/dL', key: 'glucose_mg_dl', check: 'high', threshold: 125 },
            { label: 'Diabetes (Ayuno)', value: '≥ 126 mg/dL', key: 'glucose_mg_dl', check: 'high', threshold: 126 },
            { label: 'HbA1c Normal', value: '< 5.7%', key: 'hba1c', check: 'high', threshold: 5.7 },
            { label: 'HbA1c Prediabetes', value: '5.7 - 6.4%', key: 'hba1c', check: 'high', threshold: 6.4 },
            { label: 'HbA1c Diabetes', value: '≥ 6.5%', key: 'hba1c', check: 'high', threshold: 6.5 },
        ]
    },
    {
        id: 'default-bp-aha',
        title: 'Presión Arterial (AHA/ACC)',
        category: 'Cardiovascular',
        source: 'American Heart Association',
        icon_svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path><path d="M12 5.67l-1.06-1.06"></path></svg>',
        linked_tool: null,
        clinic_id: null,
        created_at: new Date().toISOString(),
        user_id: null,
        content: [
            { label: 'Normal', value: '< 120/80 mmHg', key: 'bp', check: 'high', threshold: [120, 80] },
            { label: 'Elevada', value: '120-129 / <80 mmHg' },
            { label: 'Hipertensión Nivel 1', value: '130-139 / 80-89 mmHg', key: 'bp', check: 'high', threshold: [130, 80] },
            { label: 'Hipertensión Nivel 2', value: '≥ 140 / ≥ 90 mmHg', key: 'bp', check: 'high', threshold: [140, 90] },
        ]
    },
    {
        id: 'default-lipids-atp',
        title: 'Perfil Lipídico (ATP III)',
        category: 'Cardiovascular',
        source: 'NCEP ATP III',
        icon_svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
        linked_tool: null,
        clinic_id: null,
        created_at: new Date().toISOString(),
        user_id: null,
        content: [
            { label: 'Colesterol Total Óptimo', value: '< 200 mg/dL', key: 'cholesterol_mg_dl', check: 'high', threshold: 200 },
            { label: 'Colesterol Total Alto', value: '≥ 240 mg/dL', key: 'cholesterol_mg_dl', check: 'high', threshold: 240 },
            { label: 'Triglicéridos Normal', value: '< 150 mg/dL', key: 'triglycerides_mg_dl', check: 'high', threshold: 150 },
            { label: 'Triglicéridos Alto', value: '200 - 499 mg/dL', key: 'triglycerides_mg_dl', check: 'high', threshold: 200 },
        ]
    },
    {
        id: 'default-imc-oms',
        title: 'Clasificación IMC (OMS)',
        category: 'Antropometría',
        source: 'Organización Mundial de la Salud',
        icon_svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="15"></line></svg>',
        linked_tool: 'antropometria',
        clinic_id: null,
        created_at: new Date().toISOString(),
        user_id: null,
        content: [
            { label: 'Bajo Peso', value: '< 18.5', key: 'imc', check: 'low', threshold: 18.5 },
            { label: 'Peso Normal', value: '18.5 - 24.9' },
            { label: 'Sobrepeso', value: '25.0 - 29.9', key: 'imc', check: 'high', threshold: 25 },
            { label: 'Obesidad I', value: '30.0 - 34.9', key: 'imc', check: 'high', threshold: 30 },
            { label: 'Obesidad II', value: '35.0 - 39.9', key: 'imc', check: 'high', threshold: 35 },
            { label: 'Obesidad III', value: '≥ 40.0', key: 'imc', check: 'high', threshold: 40 },
        ]
    }
];