
import React, { FC, useMemo, useState } from 'react';

interface ServicesChartProps {
    data: Record<string, number>;
}

const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'];

const ServicesChart: FC<ServicesChartProps> = ({ data }) => {
    const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

    const chartData = useMemo(() => {
        // FIX: Explicitly cast values to Number for safe arithmetic operations.
        // Object.values can return `unknown[]`, so casting to Number prevents type errors during reduction.
        const total: number = Object.values(data).reduce((sum: number, v: any) => sum + Number(v), 0);
        if (total === 0) return [];
        return Object.entries(data)
            .map(([name, value], index) => ({
                name,
                // FIX: Ensure value is treated as a number for calculations.
                value: Number(value),
                // FIX: Ensure value is a number before performing division.
                percentage: total > 0 ? (Number(value) / total) * 100 : 0,
                color: colors[index % colors.length]
            }))
            .sort((a, b) => b.value - a.value);
    }, [data]);

    const radius = 80;
    const circumference = 2 * Math.PI * radius;

    let accumulatedPercentage = 0;

    if (chartData.length === 0) {
        return <div style={{...chartStyles.container, justifyContent: 'center', alignItems: 'center', display: 'flex' }}><p>Sin datos de servicios para este periodo.</p></div>;
    }

    return (
        <div style={chartStyles.container}>
            <h3 style={chartStyles.title}>Distribución por Servicio</h3>
            <div style={chartStyles.chartWrapper}>
                <svg viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
                    {chartData.map((slice, index) => {
                        const offset = (accumulatedPercentage / 100) * circumference;
                        const dasharray = (slice.percentage / 100) * circumference;
                        accumulatedPercentage += slice.percentage;

                        return (
                            <circle
                                key={slice.name}
                                cx="100"
                                cy="100"
                                r={radius}
                                fill="transparent"
                                stroke={slice.color}
                                strokeWidth="30"
                                strokeDasharray={`${dasharray} ${circumference}`}
                                strokeDashoffset={-offset}
                                onMouseEnter={() => setHoveredSlice(slice.name)}
                                onMouseLeave={() => setHoveredSlice(null)}
                                style={{
                                    transition: 'all 0.2s',
                                    transformOrigin: 'center',
                                    transform: hoveredSlice === slice.name ? 'scale(1.05)' : 'scale(1)',
                                }}
                            />
                        );
                    })}
                </svg>
                <div style={chartStyles.centerText}>
                    <span>Total</span>
                    <span style={{fontWeight: 'bold', fontSize: '1.5rem'}}>{chartData.length}</span>
                    <span>Servicios</span>
                </div>
            </div>
            <div style={chartStyles.legend}>
                {chartData.map(slice => (
                    <div key={slice.name} style={chartStyles.legendItem} onMouseEnter={() => setHoveredSlice(slice.name)} onMouseLeave={() => setHoveredSlice(null)}>
                        <span style={{...chartStyles.legendColor, backgroundColor: slice.color}}></span>
                        <span style={{...chartStyles.legendLabel, fontWeight: hoveredSlice === slice.name ? 700 : 400}}>{slice.name}</span>
                        <span style={{...chartStyles.legendValue, fontWeight: hoveredSlice === slice.name ? 700 : 400}}>{slice.percentage.toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const chartStyles: { [key: string]: React.CSSProperties } = {
    container: { backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: '12px', height: '100%', display: 'flex', flexDirection: 'column' },
    title: { margin: '0 0 1rem 0', fontWeight: 600 },
    chartWrapper: { position: 'relative', width: '200px', height: '200px', margin: '0 auto' },
    centerText: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', display: 'flex', flexDirection: 'column', lineHeight: 1.2, color: 'var(--text-light)' },
    legend: { flex: 1, overflowY: 'auto', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    legendItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', transition: 'background-color 0.2s', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' },
    legendColor: { width: '12px', height: '12px', borderRadius: '50%' },
    legendLabel: { flex: 1 },
    legendValue: { fontWeight: 600, color: 'var(--text-color)' },
};

export default ServicesChart;
