
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
    zIndex?: number;
    onUpdatePortions?: (newPortions: number) => void;
}

const modalRoot = document.getElementById('modal-root');

const FoodExamplesModal: FC<FoodExamplesModalProps> = ({ isOpen, onClose, equivalent, portions, zIndex = 1050, onUpdatePortions }) => {
    const [foods, setFoods] = useState<SmaeFood[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFood, setSelectedFood] = useState<SmaeFood | null>(null);
    const [customQuantity, setCustomQuantity] = useState('');

    useEffect(() => {
        const fetchFoods = async () => {
            if (!isOpen) return;
            setLoading(true);
            
            // Normalize subgroup name for matching
            const searchTerm = equivalent.subgroup_name;

            const { data, error } = await (supabase as any)
                .from('smae_foods')
                .select('*')
                .ilike('subgroup', `%${searchTerm}%`)
                .order('name');
            
            if (error) {
                console.error("Error fetching foods:", error);
            } else {
                setFoods((data as SmaeFood[]) || []);
            }
            setLoading(false);
        };

        fetchFoods();
    }, [equivalent, isOpen]);

    const filteredFoods = useMemo(() => {
        return foods.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [foods, searchTerm]);

    const handleSelectFood = (food: SmaeFood) => {
        setSelectedFood(food);
        // Default to the base amount of the SMAE unit
        setCustomQuantity(food.amount.toString());
    };

    const calculatedPortions = useMemo(() => {
        if (!selectedFood || !customQuantity) return 0;
        const qty = parseFloat(customQuantity);
        if (isNaN(qty) || qty <= 0) return 0;
        
        // Calculation: (User Qty / SMAE Base Qty) = Equivalent Portions
        // Example: Base is 0.5 (piece). User wants 1. Result = 2.0 portions.
        return qty / selectedFood.amount;
    }, [selectedFood, customQuantity]);

    const formatValue = (base: number | null | undefined, factor: number, fallback: number = 0) => {
        const val = base !== null && base !== undefined ? base : fallback;
        const total = val * factor;
        if (Math.abs(total - Math.round(total)) < 0.05) {
            return Math.round(total);
        }
        return parseFloat(total.toFixed(1));
    };

    const handleApply = () => {
        if (onUpdatePortions && calculatedPortions > 0) {
            onUpdatePortions(parseFloat(calculatedPortions.toFixed(2)));
        }
    };

    if (!isOpen || !modalRoot) return null;

    return createPortal(
        <div style={{...styles.modalOverlay, zIndex: zIndex}}>
            <div style={{...styles.modalContent, maxWidth: '700px', height: '85vh', display: 'flex', flexDirection: 'column'}} className="fade-in">
                <div style={styles.modalHeader}>
                    <div>
                        <h2 style={{...styles.modalTitle, margin: 0}}>Ejemplos: {equivalent.subgroup_name}</h2>
                        <p style={{margin: '0.25rem 0 0 0', color: 'var(--primary-color)', fontWeight: 600}}>
                            Actual: {portions} porción(es)
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
                            <p style={{color: 'var(--text-light)'}}>No se encontraron alimentos específicos.</p>
                        </div>
                    ) : (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', paddingBottom: selectedFood ? '180px' : '0'}}>
                            {filteredFoods.map(food => {
                                // Default visualization uses the parent's portion count
                                const displayPortions = selectedFood?.id === food.id ? calculatedPortions : portions;
                                const totalAmount = formatValue(food.amount, displayPortions);
                                const totalWeight = food.gross_weight ? formatValue(food.gross_weight, displayPortions) : null;
                                
                                const totalKcal = formatValue(food.energy_kcal, displayPortions, equivalent.kcal);
                                const isSelected = selectedFood?.id === food.id;

                                return (
                                    <div 
                                        key={food.id} 
                                        onClick={() => handleSelectFood(food)}
                                        style={{
                                            backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--surface-color)',
                                            border: `1px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                            borderRadius: '12px',
                                            padding: '1rem',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.5rem',
                                            cursor: 'pointer'
                                        }} 
                                        className="nav-item-hover"
                                    >
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                                            <div>
                                                <p style={{margin: 0, fontWeight: 700, color: 'var(--text-color)', fontSize: '1rem'}}>{food.name}</p>
                                                <p style={{margin: '0.25rem 0 0 0', fontWeight: 600, fontSize: '1.1rem', color: isSelected ? 'var(--primary-dark)' : 'var(--primary-color)'}}>
                                                    {totalAmount} {food.unit}
                                                    {totalWeight && <span style={{fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: 400, marginLeft: '0.5rem'}}>({totalWeight}g aprox)</span>}
                                                </p>
                                            </div>
                                            <div style={{textAlign: 'right'}}>
                                                <span style={{fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-color)'}}>{totalKcal} kcal</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                {/* Sticky Calculation Footer */}
                {selectedFood && onUpdatePortions && (
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        backgroundColor: 'var(--surface-color)',
                        borderTop: '1px solid var(--border-color)',
                        padding: '1rem 1.5rem',
                        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
                        zIndex: 10
                    }} className="fade-in-up">
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                            <h4 style={{margin: 0, fontSize: '1rem', color: 'var(--primary-color)'}}>Calculadora Inversa</h4>
                            <button onClick={() => setSelectedFood(null)} style={{background: 'none', border: 'none', color: 'var(--text-light)', fontSize: '0.9rem', cursor: 'pointer'}}>Cancelar</button>
                        </div>
                        
                        <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-end'}}>
                            <div style={{flex: 1}}>
                                <label style={{fontSize: '0.8rem', color: 'var(--text-light)', display: 'block', marginBottom: '0.25rem'}}>Cantidad de {selectedFood.name}</label>
                                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                    <input 
                                        type="number" 
                                        value={customQuantity}
                                        onChange={e => setCustomQuantity(e.target.value)}
                                        style={{
                                            flex: 1, padding: '0.5rem', fontSize: '1.2rem', fontWeight: 700, 
                                            borderRadius: '8px', border: '1px solid var(--border-color)',
                                            margin: 0
                                        }}
                                        autoFocus
                                    />
                                    <span style={{fontSize: '1rem', fontWeight: 600}}>{selectedFood.unit}</span>
                                </div>
                            </div>
                            
                            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '0.5rem'}}>
                                <span style={{fontSize: '1.5rem'}}>➔</span>
                            </div>
                            
                            <div style={{flex: 1}}>
                                <label style={{fontSize: '0.8rem', color: 'var(--text-light)', display: 'block', marginBottom: '0.25rem'}}>Equivalentes</label>
                                <div style={{
                                    padding: '0.5rem', fontSize: '1.2rem', fontWeight: 700, 
                                    backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)',
                                    borderRadius: '8px', textAlign: 'center'
                                }}>
                                    {calculatedPortions.toFixed(2)}
                                </div>
                            </div>
                        </div>
                        
                        <button 
                            onClick={handleApply}
                            disabled={calculatedPortions <= 0}
                            className="button-primary"
                            style={{width: '100%', marginTop: '1rem', padding: '0.8rem', fontSize: '1rem'}}
                        >
                            Aplicar al Plan
                        </button>
                    </div>
                )}
            </div>
        </div>,
        modalRoot
    );
};

export default FoodExamplesModal;
