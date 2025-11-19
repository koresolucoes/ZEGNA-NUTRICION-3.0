import React, { FC, useState, useEffect, useRef } from 'react';
import { styles } from '../../constants'; // Ensure styles are imported if needed, though we override mostly

interface ChartDataPoint {
    date: string;
    value: number;
}

interface ProgressChartProps {
    title: string;
    data: ChartDataPoint[];
    unit: string;
    color?: string;
    isPrinting?: boolean;
    theme?: 'light' | 'dark';
}

const ProgressChart: FC<ProgressChartProps> = ({ title, data, unit, color = 'var(--primary-color)', isPrinting = false, theme = 'light' }) => {
    const [tooltip, setTooltip] = useState<{ x: number; y: number; point: ChartDataPoint } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(300); // Default width, will adjust

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                setWidth(containerRef.current.offsetWidth);
            }
        };
        
        // Initial size
        handleResize();
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isDark = theme === 'dark';
    const containerBg = isDark ? '#2a3f5f' : 'var(--surface-color)';
    const textColor = isDark ? '#fff' : 'var(--text-color)';
    const lightTextColor = isDark ? '#ccc' : 'var(--text-light)';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'var(--border-color)';
    const lineColor = isDark ? '#7bceff' : color;

    // If container is hidden or too small initially
    const safeWidth = width > 0 ? width : 300;
    const height = 250;
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartWidth = safeWidth - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    if (data.length < 2) {
        return (
            <div style={{
                backgroundColor: containerBg, 
                borderRadius: '16px', 
                padding: '1.5rem', 
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow)'
            }} ref={containerRef}>
                <h4 style={{margin: '0 0 1rem 0', fontWeight: 600, fontSize: '1rem', color: textColor}}>{title}</h4>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '150px', color: lightTextColor, fontSize: '0.9rem'}}>
                    <p>Se requieren al menos 2 registros.</p>
                </div>
            </div>
        );
    }

    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const dates = data.map(d => new Date(d.date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    
    // Y-axis scale
    const yScale = (value: number) => {
        const range = maxValue - minValue;
        // Add some padding to Y axis
        const yPadding = range === 0 ? maxValue * 0.1 : range * 0.1; 
        const effectiveMin = minValue - yPadding;
        const effectiveMax = maxValue + yPadding;
        const effectiveRange = effectiveMax - effectiveMin;
        
        return chartHeight - ((value - effectiveMin) / effectiveRange) * chartHeight;
    };
    
    // X-axis scale
    const xScale = (date: number) => {
        const range = maxDate - minDate;
        if (range === 0) return chartWidth / 2;
        return ((date - minDate) / range) * chartWidth;
    };

    // Path for the line
    const path = data.map((point, i) => {
        const x = xScale(new Date(point.date).getTime());
        const y = yScale(point.value);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    // Area path (for gradient)
    const areaPath = `${path} L ${xScale(new Date(data[data.length-1].date).getTime())} ${chartHeight} L ${xScale(new Date(data[0].date).getTime())} ${chartHeight} Z`;

    // Generate Y-axis labels (3 labels max for mobile cleanliness)
    const yAxisLabels = [minValue, (minValue + maxValue) / 2, maxValue].map(v => ({
        y: yScale(v),
        label: v.toFixed(1)
    }));

    return (
        <div style={{
            backgroundColor: containerBg, 
            borderRadius: '16px', 
            padding: '1.5rem', 
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow)',
            width: '100%',
            position: 'relative'
        }} className="report-chart-bg" ref={containerRef}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                 <h4 style={{margin: 0, fontWeight: 700, fontSize: '1rem', color: textColor}}>{title}</h4>
                 <span style={{fontSize: '0.8rem', color: lightTextColor, backgroundColor: 'var(--surface-hover-color)', padding: '2px 8px', borderRadius: '10px'}}>{unit}</span>
            </div>
            
            <div style={{ position: 'relative', overflow: 'hidden' }}>
                <svg viewBox={`0 0 ${safeWidth} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                    <defs>
                        <linearGradient id={`gradient-${title}`} x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
                            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    <g transform={`translate(${padding.left}, ${padding.top})`}>
                        {/* Grid Lines */}
                        {yAxisLabels.map((label, i) => (
                            <line key={i} x1="0" y1={label.y} x2={chartWidth} y2={label.y} stroke={gridColor} strokeDasharray="4 4" strokeWidth="1" />
                        ))}
                        
                        {/* Y Axis Labels */}
                        {yAxisLabels.map((label, i) => (
                           <text key={i} x="-10" y={label.y} dy="0.32em" textAnchor="end" fill={lightTextColor} fontSize="10">{label.label}</text>
                        ))}

                        {/* Area fill */}
                        <path d={areaPath} fill={`url(#gradient-${title})`} stroke="none" />

                        {/* Line */}
                        <path d={path} fill="none" stroke={lineColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                        {/* Points */}
                        {data.map((point, i) => (
                            <circle
                                key={i}
                                cx={xScale(new Date(point.date).getTime())}
                                cy={yScale(point.value)}
                                r="5"
                                fill={containerBg}
                                stroke={lineColor}
                                strokeWidth="2"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={!isPrinting ? (e) => {
                                    // Calculate position relative to the svg
                                    setTooltip({ 
                                        x: xScale(new Date(point.date).getTime()), 
                                        y: yScale(point.value), 
                                        point 
                                    });
                                } : undefined}
                                onMouseLeave={!isPrinting ? () => setTooltip(null) : undefined}
                            />
                        ))}
                        
                        {/* X Axis Labels (First and Last only to prevent overlap) */}
                        <text x={0} y={chartHeight + 20} textAnchor="start" fill={lightTextColor} fontSize="10">
                            {new Date(data[0].date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                        </text>
                        <text x={chartWidth} y={chartHeight + 20} textAnchor="end" fill={lightTextColor} fontSize="10">
                            {new Date(data[data.length - 1].date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                        </text>
                    </g>
                </svg>

                {!isPrinting && tooltip && (
                     <div style={{ 
                         position: 'absolute',
                         left: padding.left + tooltip.x, 
                         top: padding.top + tooltip.y - 40,
                         transform: 'translateX(-50%)',
                         backgroundColor: 'var(--inverse-surface)',
                         color: 'var(--inverse-on-surface)',
                         padding: '0.5rem',
                         borderRadius: '8px',
                         fontSize: '0.8rem',
                         pointerEvents: 'none',
                         whiteSpace: 'nowrap',
                         boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                         zIndex: 10
                     }}>
                        <div style={{fontWeight: 600}}>{new Date(tooltip.point.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</div>
                        <div>{tooltip.point.value.toFixed(1)} {unit}</div>
                        <div style={{position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid var(--inverse-surface)'}}></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProgressChart;