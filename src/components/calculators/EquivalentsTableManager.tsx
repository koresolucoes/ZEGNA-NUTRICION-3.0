
import React, { FC, useState, useMemo } from 'react';
import { supabase } from '../../supabase';
import { FoodEquivalent } from '../../types';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import EquivalentFormModal from './EquivalentFormModal';
import ConfirmationModal from '../shared/ConfirmationModal';

interface EquivalentsTableManagerProps {
    equivalents: FoodEquivalent[];
    onDataChange: () => void;
}

const EquivalentsTableManager: FC<EquivalentsTableManagerProps> = ({ equivalents, onDataChange }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEquivalent, setEditingEquivalent] = useState<FoodEquivalent | null>(null);
    const [deletingEquivalent, setDeletingEquivalent] = useState<FoodEquivalent | null>(null);
    const [isSmaeModalOpen, setIsSmaeModalOpen] = useState(false);

    const groupedEquivalents = useMemo(() => {
        return equivalents.reduce((acc, eq) => {
            const group = eq.group_name;
            if (!acc[group]) {
                acc[group] = [];
            }
            acc[group].push(eq);
            return acc;
        }, {} as Record<string, FoodEquivalent[]>);
    }, [equivalents]);

    // Define the specific order for food groups
    const groupOrder = [
        'Verduras', 'Frutas', 'Cereales y Tubérculos', 'Leguminosas', 
        'Alimentos de Origen Animal', 'Leche', 'Aceites y Grasas', 
        'Azúcares', 'Alimentos Libres en Energía', 'Bebidas Alcohólicas'
    ];

    const handleEdit = (eq: FoodEquivalent) => { setEditingEquivalent(eq); setIsModalOpen(true); };
    const handleAddNew = () => { setEditingEquivalent(null); setIsModalOpen(true); };
    const handleCloseModal = () => { setIsModalOpen(false); setEditingEquivalent(null); setDeletingEquivalent(null); }
    const handleSaveSuccess = () => { handleCloseModal(); onDataChange(); }
    const handleDelete = (eq: FoodEquivalent) => { setDeletingEquivalent(eq); };
    const handleConfirmDelete = () => { setDeletingEquivalent(null); onDataChange(); }

    // Mock logic for brevity, ideally imported
    const handleApplySmae = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuario no autenticado.");
        setIsSmaeModalOpen(false);
        onDataChange();
    };

    return (
        <div className="fade-in" style={{ backgroundColor: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
             {isModalOpen && <EquivalentFormModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveSuccess} equivalentToEdit={editingEquivalent} />}
             {deletingEquivalent && <ConfirmationModal isOpen={!!deletingEquivalent} onClose={() => setDeletingEquivalent(null)} title="Confirmar Eliminación" message={<p>¿Seguro que quieres eliminar <strong>{deletingEquivalent.subgroup_name}</strong>?</p>} confirmText="Sí, eliminar" itemToDelete={deletingEquivalent} tableName="food_equivalents" onSuccess={handleConfirmDelete} />}
             
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem'}}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-color)' }}>Tabla de Alimentos</h3>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)' }}>Gestiona los grupos de equivalentes para el planificador.</p>
                </div>
                <div style={{display: 'flex', gap: '0.75rem'}}>
                    <button onClick={() => setIsSmaeModalOpen(true)} className="button-secondary" style={{padding: '0.6rem 1.2rem', fontSize: '0.9rem', borderRadius: '8px'}}>Importar SMAE</button>
                    <button onClick={handleAddNew} className="button-primary" style={{padding: '0.6rem 1.2rem', fontSize: '0.9rem', borderRadius: '8px'}}>{ICONS.add} Nuevo</button>
                </div>
            </div>

            <div style={{...styles.tableContainer, boxShadow: 'none', border: '1px solid var(--border-color)', borderRadius: '12px'}}>
                 <table style={styles.table}>
                    <thead>
                        <tr style={{backgroundColor: 'var(--surface-hover-color)'}}>
                            <th style={{...styles.th, borderBottom: '1px solid var(--border-color)'}}>Subgrupo</th>
                            <th style={{...styles.th, textAlign: 'right', borderBottom: '1px solid var(--border-color)'}}>Proteína</th>
                            <th style={{...styles.th, textAlign: 'right', borderBottom: '1px solid var(--border-color)'}}>Lípidos</th>
                            <th style={{...styles.th, textAlign: 'right', borderBottom: '1px solid var(--border-color)'}}>Carbs</th>
                            <th style={{...styles.th, textAlign: 'right', borderBottom: '1px solid var(--border-color)'}}>Kcal</th>
                            <th style={{...styles.th, width: '80px', borderBottom: '1px solid var(--border-color)'}}></th>
                        </tr>
                    </thead>
                    <tbody>
                         {groupOrder.filter(groupName => groupedEquivalents[groupName]).map(groupName => {
                            const items = groupedEquivalents[groupName];
                            return (
                                <React.Fragment key={groupName}>
                                    <tr style={{backgroundColor: 'var(--surface-color)'}}>
                                        <td colSpan={6} style={{padding: '0.75rem 1.5rem', fontWeight: 700, color: 'var(--primary-color)', fontSize: '0.85rem', borderBottom: '1px solid var(--border-color)', textTransform: 'uppercase', letterSpacing: '0.5px', backgroundColor: 'var(--primary-light)'}}>
                                            {groupName}
                                        </td>
                                    </tr>
                                    {items.sort((a, b) => a.subgroup_name.localeCompare(b.subgroup_name)).map(eq => (
                                        <tr key={eq.id} className="table-row-hover" style={{backgroundColor: 'var(--surface-color)'}}>
                                            <td style={{...styles.td, paddingLeft: '2rem', fontWeight: 500}}>{eq.subgroup_name}</td>
                                            <td style={{...styles.td, textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-light)'}}>{eq.protein_g}g</td>
                                            <td style={{...styles.td, textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-light)'}}>{eq.lipid_g}g</td>
                                            <td style={{...styles.td, textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-light)'}}>{eq.carb_g}g</td>
                                            <td style={{...styles.td, textAlign: 'right', fontWeight: 600, color: 'var(--text-color)'}}>{eq.kcal}</td>
                                            <td style={styles.td}>
                                                <div style={{display: 'flex', gap: '0.25rem', justifyContent: 'flex-end'}}>
                                                    <button onClick={() => handleEdit(eq)} style={{...styles.iconButton, padding: '4px'}} title="Editar">{ICONS.edit}</button>
                                                    <button onClick={() => handleDelete(eq)} style={{...styles.iconButton, color: 'var(--error-color)', padding: '4px'}} title="Eliminar">{ICONS.delete}</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                 </table>
            </div>
        </div>
    );
};

export default EquivalentsTableManager;
