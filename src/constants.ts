
import React from 'react';
import { createGlobalStyle } from 'styled-components';

export const styles: { [key: string]: React.CSSProperties } = {
    // Auth
    authContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1.5rem', backgroundColor: 'var(--background-color)' },
    authBox: { width: '100%', maxWidth: '400px', padding: '2.5rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-hover)', border: '1px solid var(--border-color)' },
    header: { textAlign: 'center' as const, marginBottom: '2rem' },
    title: { color: 'var(--text-color)', margin: '0 0 0.5rem 0', fontWeight: 700, fontSize: '1.5rem' },
    form: { display: 'flex', flexDirection: 'column' as const },
    formActions: { display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' },
    
    // Floating Actions
    floatingActions: {
        position: 'fixed' as const,
        bottom: '2rem',
        right: '2rem',
        zIndex: 1050,
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
    },
    floatingSaveButton: {
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        padding: 0,
        fontSize: '1.5rem',
        boxShadow: 'var(--shadow-hover)',
        backgroundColor: 'var(--primary-color)',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },

    // General Elements
    label: { display: 'block', marginBottom: '0.375rem', fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-color)'},
    toggleAuth: { marginTop: '2rem', textAlign: 'center' as const, fontSize: '0.875rem', color: 'var(--text-light)' },
    link: { color: 'var(--primary-color)', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' },
    error: { color: 'var(--error-color)', backgroundColor: 'var(--error-bg)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', textAlign: 'center' as const, fontSize: '0.875rem', fontWeight: 500, border: '1px solid var(--error-color)' },
    
    // Dashboard Layout
    dashboardLayout: { display: 'flex', minHeight: '100vh', position: 'relative', backgroundColor: 'var(--background-color)' },
    
    // Sidebar - Modernizada
    sidebar: { width: '260px', backgroundColor: 'var(--surface-color)', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column' as const, borderRight: '1px solid var(--border-color)', transition: 'transform 0.3s ease', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 1100 },
    sidebarHidden: { transform: 'translateX(-100%)' },
    sidebarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '0 0.5rem' },
    sidebarToggleButton: { background: 'transparent', border: 'none', color: 'var(--text-light)', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    navItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.25rem', cursor: 'pointer', transition: 'all 0.15s', fontWeight: 500, color: 'var(--text-light)', fontSize: '0.9rem' },
    
    // Main Content
    mainContent: { flex: 1, padding: '2rem', overflowY: 'auto' as const, transition: 'margin-left 0.3s ease', maxWidth: '100%', margin: '0 auto' },
    mainContentMobile: { marginLeft: 0, padding: '1rem', width: '100%' },
    mainContentDesktop: { marginLeft: '260px' },
    pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap' as const, gap: '1rem' },
    hamburger: { display: 'inline-block', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: 'var(--text-color)' },
    
    // Tables - Clean Look
    tableContainer: { backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow)', overflow: 'hidden', border: '1px solid var(--border-color)' },
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { padding: '1rem 1.5rem', textAlign: 'left' as const, borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', fontWeight: 600, color: 'var(--text-light)', fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    td: { padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-color)', verticalAlign: 'middle', fontSize: '0.9rem' },
    
    // Actions
    actionButtons: { display: 'flex', gap: '0.5rem' },
    iconButton: { background: 'transparent', border: 'none', color: 'var(--text-light)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background-color 0.2s, color 0.2s, transform 0.1s' },
    
    // Modals - Cleaner
    modalOverlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, overflowY: 'auto' as const, padding: '1rem' },
    modalContent: { backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '550px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' as const, boxShadow: 'var(--shadow-hover)', border: 'none', outline: 'none' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--border-color)' },
    modalTitle: { margin: 0, fontSize: '1.125rem', color: 'var(--text-color)', fontWeight: 600 },
    modalBody: { padding: '1.5rem', overflowY: 'auto' as const },
    modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--surface-hover-color)', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)' },
    
    // Cards - Data Focused
    clientCard: { backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '0.75rem', boxShadow: 'var(--shadow)', border: '1px solid var(--border-color)', transition: 'transform 0.2s' },
    
    // Widget Cards for Person Detail
    detailCard: { 
        backgroundColor: 'var(--surface-color)', 
        borderRadius: '12px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)', 
        marginBottom: '0', 
        overflow: 'hidden', 
        border: '1px solid var(--border-color)' 
    },
    detailCardHeader: { padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-hover-color)' },
    detailCardTitle: { margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-color)' },
    detailCardBody: { padding: '1.25rem' },
    
    detailGroup: { marginBottom: '1rem' },
    detailGroupTitle: { fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    clinicalDataValue: { fontSize: '1rem', fontWeight: 500, color: 'var(--text-color)' },
    
    // Dashboard Specific - Minimalist Widgets
    dashboardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' },
    summaryCard: { backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-start', textAlign: 'left' as const, transition: 'transform 0.2s', border: '1px solid var(--border-color)', height: '100%', justifyContent: 'center' },
    summaryCardIcon: { color: 'var(--primary-color)', marginBottom: '0.75rem', padding: '0.5rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', display: 'inline-flex' },
    summaryCardValue: { fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-color)', margin: '0.25rem 0 0 0', lineHeight: 1 },
    summaryCardLabel: { fontSize: '0.875rem', color: 'var(--text-light)', margin: 0, fontWeight: 500 },
    
    infoCard: { backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow)', overflow: 'hidden', border: '1px solid var(--border-color)', height: '100%', display: 'flex', flexDirection: 'column' as const },
    infoCardHeader: { padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'transparent' },
    infoCardBody: { padding: '1.25rem', flex: 1 },
    
    activityList: { listStyle: 'none', padding: 0, margin: 0 },
    activityItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 0', borderBottom: '1px solid var(--border-color)' },
    activityItemLink: { color: 'var(--text-color)', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', transition: 'color 0.2s' },
    
    // Plan Status
    planStatus: { display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.85rem', padding: '2px 8px', borderRadius: '999px', backgroundColor: 'var(--surface-hover-color)', border: '1px solid var(--border-color)' },
    statusDot: { width: '6px', height: '6px', borderRadius: '50%' },
    
    planDurationButtons: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' },
    
    // Filters & Search (Heuristic 7: Flexibility)
    filterBar: { 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '1.5rem', 
        alignItems: 'center', 
        flexWrap: 'wrap' as const,
        backgroundColor: 'var(--surface-color)',
        padding: '0.75rem',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    },
    searchInputContainer: { position: 'relative', flex: 1, minWidth: '240px' },
    searchInput: { 
        paddingLeft: '2.5rem', 
        width: '100%', 
        margin: 0, 
        borderRadius: '8px', 
        height: '40px', 
        border: '1px solid var(--border-color)', 
        backgroundColor: 'var(--background-color)',
        fontSize: '0.9rem',
        transition: 'border-color 0.2s'
    },
    searchInputIcon: { position: 'absolute' as const, top: '50%', left: '0.75rem', transform: 'translateY(-50%)', color: 'var(--text-light)', fontSize: '1rem' },
    filterButtonGroup: { display: 'flex', gap: '4px', padding: '4px', backgroundColor: 'var(--background-color)', borderRadius: '8px', border: '1px solid var(--border-color)' },

    // NIELSEN FOLDER TABS (Heuristic 2 & 8)
    // This simulates a physical folder tab that merges with the content area
    tabContainer: {
        display: 'flex',
        gap: '4px',
        paddingLeft: '1rem',
        marginBottom: '-1px', // Overlap with the content border
        zIndex: 1,
        position: 'relative' as const,
        overflowX: 'auto' as const,
    },
    folderTab: {
        padding: '0.75rem 1.5rem',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
        border: '1px solid transparent', // Default invisible border
        backgroundColor: 'transparent',
        color: 'var(--text-light)',
        cursor: 'pointer',
        fontWeight: 500,
        fontSize: '0.95rem',
        transition: 'all 0.2s ease-in-out',
        position: 'relative' as const,
        marginBottom: '-1px', // Crucial for the merge effect
        whiteSpace: 'nowrap' as const
    },
    folderTabActive: {
        backgroundColor: 'var(--surface-color)',
        color: 'var(--primary-color)',
        border: '1px solid var(--border-color)',
        borderBottom: '1px solid var(--surface-color)', // "Erase" the bottom border to merge
        fontWeight: 600,
        zIndex: 2
    },
    folderContent: {
        backgroundColor: 'var(--surface-color)',
        borderRadius: '0 8px 8px 8px', // Top left square to meet the first tab, others rounded
        border: '1px solid var(--border-color)',
        padding: '2rem',
        boxShadow: 'var(--shadow)',
        position: 'relative' as const,
        zIndex: 0
    },
    // Variant for nested content (e.g. inside Clinical History)
    nestedFolderContent: {
        backgroundColor: 'var(--surface-color)',
        borderRadius: '0 8px 8px 8px',
        border: '1px solid var(--border-color)',
        padding: '1.5rem',
        marginTop: 0, // Adjusted to merge with tabs
        position: 'relative' as const,
        zIndex: 0
    },
    
    // Patient Portal
    patientPortalLayout: { display: 'flex', minHeight: '100vh', position: 'relative', backgroundColor: 'var(--background-color)' },
    patientPortalHeader: { padding: '1rem', backgroundColor: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, position: 'sticky', top: 0, zIndex: 100 },
    patientPortalMain: { flex: 1, transition: 'margin-left 0.3s ease', overflow: 'auto', minWidth: 0 },
    patientSidebar: { width: '280px', backgroundColor: 'var(--surface-color)', padding: '1.5rem', display: 'flex', flexDirection: 'column' as const, borderRight: '1px solid var(--border-color)', transition: 'transform 0.3s ease', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 1100 },
    patientContent: { padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' },
};
