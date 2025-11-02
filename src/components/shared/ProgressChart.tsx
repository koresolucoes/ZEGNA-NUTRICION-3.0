import React, { FC, useState } from 'react';

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

    const isDark = theme === 'dark';
    const containerBg = isDark ? '#2a3f5f' : 'var(--surface-color)';
    const textColor = isDark ? '#fff' : 'var(--text-color)';
    const lightTextColor = isDark ? '#ccc' : 'var(--text-light)';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'var(--border-color)';
    const lineColor = isDark ? '#7bceff' : color;

    if (data.length < 2) {
        return (
            <div style={{...styles.chartContainer, backgroundColor: containerBg}}>
                <h4 style={{...styles.chartTitle, color: textColor}}>{title}</h4>
                <div style={{...styles.noData, color: lightTextColor}}>
                    <p>Não há dados suficientes para mostrar o gráfico.</p>
                </div>
            </div>
        );
    }

    const width = 500;
    const height = 300;
    const padding = { top: 20, right: 20, bottom: 60, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const values = data.map(d => d.value);
    const dates = data.map(d => new Date(d.date));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Y-axis scale
    const yScale = (value: number) => {
        const range = maxValue - minValue;
        if (range === 0) return chartHeight / 2;
        return chartHeight - ((value - minValue) / range) * chartHeight;
    };
    
    // X-axis scale
    const xScale = (date: Date) => {
        const range = maxDate.getTime() - minDate.getTime();
        if (range === 0) return chartWidth / 2;
        return ((date.getTime() - minDate.getTime()) / range) * chartWidth;
    };

    // Path for the line
    const path = data.map((point, i) => {
        const x = xScale(new Date(point.date));
        const y = yScale(point.value);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    // Generate Y-axis labels
    const yAxisLabels = () => {
        const labels = [];
        const numLabels = 5;
        const range = maxValue - minValue;
        if (range === 0) { // Handle case where all values are the same
            labels.push({ y: chartHeight / 2, label: minValue.toFixed(1) });
            return labels;
        }
        const step = range / (numLabels - 1);
        for (let i = 0; i < numLabels; i++) {
            const value = minValue + (i * step);
            labels.push({
                y: yScale(value),
                label: value.toFixed(1)
            });
        }
        return labels;
    };

    // Generate X-axis labels
    const xAxisLabels = () => {
        const labels = [];
        if (data.length === 0) return [];
        
        const uniqueDates = Array.from(new Set(data.map(d => new Date(d.date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', timeZone: 'UTC' })))).map(dateStr => {
            const originalPoint = data.find(p => new Date(p.date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', timeZone: 'UTC' }) === dateStr)!;
            return {
                label: dateStr,
                date: new Date(originalPoint.date)
            };
        });
        
        const numLabels = Math.min(uniqueDates.length, 4);
        if (numLabels <= 1) return uniqueDates.map(d => ({ x: xScale(d.date), label: d.label }));

        const step = Math.max(1, Math.floor((uniqueDates.length -1) / (numLabels - 1)));

        for (let i = 0; i < uniqueDates.length; i += step) {
             labels.push({
                x: xScale(uniqueDates[i].date),
                label: uniqueDates[i].label
            });
        }

        if ((uniqueDates.length - 1) % step !== 0) {
            const lastDate = uniqueDates[uniqueDates.length-1];
             labels.push({
                x: xScale(lastDate.date),
                label: lastDate.label
            });
        }
        return labels;
    };

    return (
        <div style={{...styles.chartContainer, backgroundColor: containerBg}} className="report-chart-bg">
            <h4 style={{...styles.chartTitle, color: textColor}}>{title} ({unit})</h4>
            <div style={{ position: 'relative' }}>
                <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
                    <g transform={`translate(${padding.left}, ${padding.top})`}>
                        {/* Grid Lines */}
                        {yAxisLabels().map((label, i) => (
                            <line key={i} x1="0" y1={label.y} x2={chartWidth} y2={label.y} stroke={gridColor} strokeWidth="0.5" />
                        ))}
                        
                        {/* Y Axis */}
                        {yAxisLabels().map((label, i) => (
                           <text key={i} x="-10" y={label.y} dy="0.32em" textAnchor="end" fill={lightTextColor} fontSize="12">{label.label}</text>
                        ))}

                        {/* X Axis */}
                        {xAxisLabels().map((label, i) => (
                            <text key={i} x={label.x} y={chartHeight + 25} textAnchor="middle" fill={lightTextColor} fontSize="12" writingMode="vertical-rl" transform={`rotate(180, ${label.x}, ${chartHeight + 25})`}>{label.label}</text>
                        ))}

                        {/* Line */}
                        <path d={path} fill="none" stroke={lineColor} strokeWidth="2" />

                        {/* Points */}
                        {data.map((point, i) => (
                            <circle
                                key={i}
                                cx={xScale(new Date(point.date))}
                                cy={yScale(point.value)}
                                r="4"
                                fill={lineColor}
                                stroke={containerBg}
                                strokeWidth="2"
                                onMouseEnter={!isPrinting ? (e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const svgRect = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
                                    setTooltip({ 
                                        x: (rect.left - svgRect.left) + rect.width / 2, 
                                        y: (rect.top - svgRect.top) - 10, 
                                        point 
                                    });
                                } : undefined}
                                onMouseLeave={!isPrinting ? () => setTooltip(null) : undefined}
                            />
                        ))}
                    </g>
                </svg>
                {!isPrinting && tooltip && (
                     <div className="chart-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
                        <div>{new Date(tooltip.point.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</div>
                        <div><strong>{tooltip.point.value.toFixed(2)} {unit}</strong></div>
                    </div>
                )}
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    chartContainer: {
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        width: '100%',
    },
    chartTitle: {
        margin: '0 0 1.5rem 0',
        fontWeight: 600,
        fontSize: '1.1rem',
    },
    noData: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '250px',
        textAlign: 'center'
    },
};

export default ProgressChart;
