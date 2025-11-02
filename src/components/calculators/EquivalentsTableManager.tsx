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

    // Define the specific order for food groups to match the standard
    const groupOrder = [
        'Verduras',
        'Frutas',
        'Cereales y Tubérculos',
        'Leguminosas',
        'Alimentos de Origen Animal',
        'Leche',
        'Aceites y Grasas',
        'Azúcares',
        'Alimentos Libres en Energía',
        'Bebidas Alcohólicas'
    ];


    const handleEdit = (eq: FoodEquivalent) => {
        setEditingEquivalent(eq);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingEquivalent(null);
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEquivalent(null);
        setDeletingEquivalent(null); // Ensure delete modal also closes
    }
    
    const handleSaveSuccess = () => {
        handleCloseModal();
        onDataChange();
    }

    const handleDelete = (eq: FoodEquivalent) => {
        setDeletingEquivalent(eq);
    };
    
    const handleConfirmDelete = () => {
        setDeletingEquivalent(null); // Close modal
        onDataChange(); // Refresh data
    }

    const handleApplySmae = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuario no autenticado para aplicar SMAE.");

        const smaeEquivalents = (userId: string) => [
            { group_name: 'Verduras', subgroup_name: 'Verduras', protein_g: 2, lipid_g: 0, carb_g: 4, kcal: 25, user_id: userId },
            { group_name: 'Frutas', subgroup_name: 'Frutas', protein_g: 0, lipid_g: 0, carb_g: 15, kcal: 60, user_id: userId },
            { group_name: 'Cereales y Tubérculos', subgroup_name: 'a. Sin grasa', protein_g: 2, lipid_g: 0, carb_g: 15, kcal: 70, user_id: userId },
            { group_name: 'Cereales y Tubérculos', subgroup_name: 'b. Con grasa', protein_g: 2, lipid_g: 5, carb_g: 15, kcal: 115, user_id: userId },
            { group_name: 'Leguminosas', subgroup_name: 'Leguminosas', protein_g: 8, lipid_g: 1, carb_g: 20, kcal: 120, user_id: userId },
            { group_name: 'Alimentos de Origen Animal', subgroup_name: 'a. Muy bajo aporte de grasa', protein_g: 7, lipid_g: 1, carb_g: 0, kcal: 40, user_id: userId },
            { group_name: 'Alimentos de Origen Animal', subgroup_name: 'b. Bajo aporte de grasa', protein_g: 7, lipid_g: 3, carb_g: 0, kcal: 55, user_id: userId },
            { group_name: 'Alimentos de Origen Animal', subgroup_name: 'c. Moderado aporte de grasa', protein_g: 7, lipid_g: 5, carb_g: 0, kcal: 75, user_id: userId },
            { group_name: 'Alimentos de Origen Animal', subgroup_name: 'd. Alto aporte de grasa', protein_g: 7, lipid_g: 8, carb_g: 0, kcal: 100, user_id: userId },
            { group_name: 'Leche', subgroup_name: 'a. Descremada', protein_g: 9, lipid_g: 2, carb_g: 12, kcal: 95, user_id: userId },
            { group_name: 'Leche', subgroup_name: 'b. Semidescremada', protein_g: 9, lipid_g: 4, carb_g: 12, kcal: 110, user_id: userId },
            { group_name: 'Leche', subgroup_name: 'c. Entera', protein_g: 9, lipid_g: 8, carb_g: 12, kcal: 150, user_id: userId },
            { group_name: 'Leche', subgroup_name: 'd. Con azúcar', protein_g: 8, lipid_g: 5, carb_g: 30, kcal: 200, user_id: userId },
            { group_name: 'Aceites y Grasas', subgroup_name: 'a. Sin proteína', protein_g: 0, lipid_g: 5, carb_g: 0, kcal: 45, user_id: userId },
            { group_name: 'Aceites y Grasas', subgroup_name: 'b. Con proteína', protein_g: 3, lipid_g: 5, carb_g: 3, kcal: 70, user_id: userId },
            { group_name: 'Azúcares', subgroup_name: 'a. Sin grasa', protein_g: 0, lipid_g: 0, carb_g: 10, kcal: 40, user_id: userId },
            { group_name: 'Azúcares', subgroup_name: 'b. Con grasa', protein_g: 0, lipid_g: 5, carb_g: 10, kcal: 85, user_id: userId },
            { group_name: 'Alimentos Libres en Energía', subgroup_name: 'Alimentos Libres en Energía', protein_g: 0, lipid_g: 0, carb_g: 0, kcal: 0, user_id: userId },
            { group_name: 'Bebidas Alcohólicas', subgroup_name: 'Bebidas Alcohólicas', protein_g: 0, lipid_g: 0, carb_g: 0, kcal: 140, user_id: userId },
        ];

        try {
            const dataToInsert = smaeEquivalents(user.id);
            const smaeSubgroupNames = dataToInsert.map(eq => eq.subgroup_name);
            
            const { error: deleteError } = await supabase
                .from('food_equivalents')
                .delete()
                .eq('user_id', user.id)
                .in('subgroup_name', smaeSubgroupNames);

            if (deleteError) throw deleteError;

            const { error: insertError } = await supabase
                .from('food_equivalents')
                .insert(dataToInsert);

            if (insertError) throw insertError;

            setIsSmaeModalOpen(false);
            onDataChange();
        } catch (error) {
            console.error("Error applying SMAE:", error);
            throw error; // Re-throw for the modal to catch and display
        }
    };

    return (
        <div className="fade-in">
             {isModalOpen && (
                <EquivalentFormModal 
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSaveSuccess}
                    equivalentToEdit={editingEquivalent}
                />
             )}
             {deletingEquivalent && (
                <ConfirmationModal 
                    isOpen={!!deletingEquivalent}
                    onClose={() => setDeletingEquivalent(null)}
                    title="Confirmar Eliminación"
                    message={<p>¿Seguro que quieres eliminar <strong>{deletingEquivalent.subgroup_name}</strong>? Este cambio no se puede deshacer.</p>}
                    confirmText="Sí, eliminar"
                    itemToDelete={deletingEquivalent}
                    tableName="food_equivalents"
                    onSuccess={handleConfirmDelete}
                />
             )}
             {isSmaeModalOpen && (
                <ConfirmationModal
                    isOpen={isSmaeModalOpen}
                    onClose={() => setIsSmaeModalOpen(false)}
                    onConfirm={handleApplySmae}
                    title="Aplicar Equivalentes SMAE"
                    message={
                        <>
                            <p>¿Estás seguro de que quieres aplicar la lista de equivalentes del <strong>SMAE (5ta Edición)</strong> a tu perfil?</p>
                            <p style={{color: 'var(--accent-color)', fontWeight: 500, marginTop: '1rem'}}>
                                ADVERTENCIA: Esto agregará la lista estándar a tu tabla. Si ya tienes equivalentes con los mismos nombres, serán <strong>sobrescritos</strong> para mantener la consistencia.
                            </p>
                        </>
                    }
                    confirmText="Sí, aplicar y sobrescribir"
                    confirmButtonClass="button-primary"
                />
             )}
            <div style={{...styles.pageHeader, border: 'none', padding: 0, marginBottom: '1.5rem'}}>
                <h2 style={{margin:0}}>Tabla de Alimentos Equivalentes</h2>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <button onClick={() => setIsSmaeModalOpen(true)} className="button-secondary">Aplicar SMAE</button>
                    <button onClick={handleAddNew}>{ICONS.add} Nuevo Equivalente</button>
                </div>
            </div>
            <p style={{marginTop: '-1rem', marginBottom: '1.5rem', color: 'var(--text-light)'}}>
                Aquí puedes gestionar tu base de datos personal de alimentos equivalentes. Todos los registros son privados para tu cuenta y puedes modificarlos libremente.
            </p>
            <div style={styles.tableContainer}>
                 <table style={{...styles.table, fontSize: '0.9rem'}}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Subgrupo</th>
                            <th style={{...styles.th, textAlign: 'right'}}>Proteína (g)</th>
                            <th style={{...styles.th, textAlign: 'right'}}>Lípidos (g)</th>
                            <th style={{...styles.th, textAlign: 'right'}}>Carbs (g)</th>
                            <th style={{...styles.th, textAlign: 'right'}}>Kcal</th>
                            <th style={styles.th}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                         {groupOrder
                            .filter(groupName => groupedEquivalents[groupName]) // Only render groups that exist in the data
                            .map(groupName => {
                            const items = groupedEquivalents[groupName];
                            return (
                                <React.Fragment key={groupName}>
                                    <tr style={{backgroundColor: 'var(--surface-hover-color)'}}>
                                        <td colSpan={6} style={{...styles.td, fontWeight: 600, color: 'var(--primary-color)'}}>
                                            {groupName}
                                        </td>
                                    </tr>
                                    {items.sort((a, b) => a.subgroup_name.localeCompare(b.subgroup_name)).map(eq => (
                                        <tr key={eq.id} className="table-row-hover">
                                            <td style={{...styles.td, paddingLeft: '2rem'}}>
                                                {eq.subgroup_name}
                                            </td>
                                            <td style={{...styles.td, textAlign: 'right'}}>{eq.protein_g}</td>
                                            <td style={{...styles.td, textAlign: 'right'}}>{eq.lipid_g}</td>
                                            <td style={{...styles.td, textAlign: 'right'}}>{eq.carb_g}</td>
                                            <td style={{...styles.td, textAlign: 'right'}}>{eq.kcal}</td>
                                            <td style={styles.td}>
                                                <div style={styles.actionButtons}>
                                                    <button onClick={() => handleEdit(eq)} style={styles.iconButton} title="Editar">{ICONS.edit}</button>
                                                    <button onClick={() => handleDelete(eq)} style={{...styles.iconButton, color: 'var(--error-color)'}} title="Eliminar">{ICONS.delete}</button>
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