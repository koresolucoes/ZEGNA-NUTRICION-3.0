
import React, { FC, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { styles } from '../../constants';
import { ICONS } from '../../pages/AuthPage';
import { FoodEquivalent, SmaeFood } from '../../types';

interface FoodExamplesModalProps {
    isOpen: boolean;
    onClose: () => void;
    equivalent: FoodEquivalent;
    portions: number;
}

const modalRoot = document.getElementById('modal-root');

const FoodExamplesModal: FC<FoodExamplesModalProps> = ({ isOpen, onClose, equivalent, portions }) => {
    const [foods, setFoods] = useState<SmaeFood[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchFoods = async () => {
            if (!isOpen) return;
            setLoading(true);
            
            // Normalize subgroup name for matching
            const searchTerm = equivalent.subgroup_name;

            const { data, error } = await supabase
                .from('smae_foods')
                .select('*')
                .ilike('subgroup', `%${searchTerm}%`)
                .order('name');
            
            if (error) {
                console.error("Error fetching foods:", error);
            } else {
                setFoods(data || []);
            }
            setLoading(false);
        };

        fetchFoods();
    }, [equivalent, isOpen]);

    const filteredFoods = useMemo(() => {
        return foods.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [foods, searchTerm]);

    // Helper to format the calculated amount cleanly
    const formatValue = (base: number | null | undefined, factor: number, fallback: number = 0) => {
        const val = base !== null && base !== undefined ? base : fallback;
        const total = val * factor;
        // If integer-ish, return integer
        if (Math.abs(total - Math.round(total)) < 0.05) {
            return Math.round(total);
        }
        return parseFloat(total.toFixed(1));
    };

    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '700px', height: '85vh', display: 'flex', flexDirection: 'column'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <div>
                        <h2 style={{...styles.modalTitle, margin: 0}}>Ejemplos: {equivalent.subgroup_name}</h2>
                        <p style={{margin: '0.25rem 0 0 0', color: 'var(--primary-color)', fontWeight: 600}}>
                            Calculando para: {portions} porción(es)
                        </p>
                    </div>
                    <button onClick={onClose} style={{...styles.iconButton, border: 'none'}}>{ICONS.close}</button>
                </div>
                
                <div style={{padding: '0 1.5rem', marginTop: '1rem'}}>
                    <div style={{...styles.searchInputContainer, width: '100%'}}>
                        <span style={styles.searchInputIcon}>🔍</span>
                        <input 
                            type="text" 
                            placeholder="Buscar alimento (ej. Manzana)..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={styles.searchInput}
                            autoFocus
                        />
                    </div>
                </div>

                <div style={{...styles.modalBody, flex: 1, overflowY: 'auto', padding: '0 1.5rem 1.5rem 1.5rem'}}>
                    {loading ? (
                        <p style={{textAlign: 'center', color: 'var(--text-light)', marginTop: '2rem'}}>Cargando alimentos...</p>
                    ) : filteredFoods.length === 0 ? (
                        <div style={{textAlign: 'center', padding: '2rem', border: '2px dashed var(--border-color)', borderRadius: '12px', marginTop: '1rem'}}>
                            <p style={{color: 'var(--text-light)'}}>No se encontraron alimentos específicos para este grupo en la base de datos.</p>
                            <p style={{fontSize: '0.85rem', color: 'var(--text-light)'}}>Intenta buscar en la lista SMAE oficial.</p>
                        </div>
                    ) : (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem'}}>
                            {filteredFoods.map(food => {
                                const totalAmount = formatValue(food.amount, portions);
                                const totalWeight = food.gross_weight ? formatValue(food.gross_weight, portions) : null;
                                
                                // Calculate specific macros using food data if available, else fallback to equivalent group data
                                const totalKcal = formatValue(food.energy_kcal, portions, equivalent.kcal);
                                const totalProt = formatValue(food.protein_g, portions, equivalent.protein_g);
                                const totalLip = formatValue(food.lipid_g, portions, equivalent.lipid_g);
                                const totalCarb = formatValue(food.carb_g, portions, equivalent.carb_g);

                                return (
                                    <div key={food.id} style={{
                                        backgroundColor: 'var(--surface-color)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '12px',
                                        padding: '1rem',
                                        transition: 'background-color 0.2s',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.5rem'
                                    }} className="nav-item-hover">
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                                            <div>
                                                <p style={{margin: 0, fontWeight: 700, color: 'var(--text-color)', fontSize: '1rem'}}>{food.name}</p>
                                                <p style={{margin: '0.25rem 0 0 0', fontWeight: 600, fontSize: '1.1rem', color: 'var(--primary-color)'}}>
                                                    {totalAmount} {food.unit}
                                                    {totalWeight && <span style={{fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: 400, marginLeft: '0.5rem'}}>({totalWeight}g aprox)</span>}
                                                </p>
                                            </div>
                                            <div style={{textAlign: 'right'}}>
                                                <span style={{fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-color)'}}>{totalKcal} kcal</span>
                                            </div>
                                        </div>
                                        
                                        {/* Macro Pills */}
                                        <div style={{display: 'flex', gap: '0.5rem', fontSize: '0.75rem', flexWrap: 'wrap'}}>
                                            <div style={{backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#EC4899', padding: '2px 8px', borderRadius: '4px', fontWeight: 600}}>
                                                P: {totalProt}g
                                            </div>
                                            <div style={{backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', padding: '2px 8px', borderRadius: '4px', fontWeight: 600}}>
                                                L: {totalLip}g
                                            </div>
                                            <div style={{backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', padding: '2px 8px', borderRadius: '4px', fontWeight: 600}}>
                                                HC: {totalCarb}g
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                <div style={styles.modalFooter}>
                    <button onClick={onClose} className="button-secondary">Cerrar</button>
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default FoodExamplesModal;
