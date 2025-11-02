import React, { FC, useMemo, useState } from 'react';

interface RevenueChartProps {
    data: Record<string, number>;
}

const RevenueChart: FC<RevenueChartProps> = ({ data }) => {
    const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; value: number } | null>(null);

    const chartData = useMemo(() => {
        const sortedDates = Object.keys(data).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        return sortedDates.map(date => ({ date, value: data[date] }));
    }, [data]);

    const width = 800;
    const height = 300;
    const padding = { top: 20, right: 30, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxValue = useMemo(() => Math.max(0, ...chartData.map(d => d.value)), [chartData]);
    const yAxisMax = Math.ceil(maxValue / 100) * 100 || 100; // Round up to nearest 100

    const xScale = (index: number) => (chartData.length > 1 ? (index / (chartData.length - 1)) * chartWidth : chartWidth / 2);
    const yScale = (value: number) => chartHeight - (value / yAxisMax) * chartHeight;

    const path = useMemo(() =>
        chartData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.value)}`).join(' ')
    , [chartData, xScale, yScale]);
    
    const yAxisLabels = [0, yAxisMax / 2, yAxisMax];
    const xAxisLabels = chartData.length > 1
        ? [chartData[0], chartData[Math.floor(chartData.length / 2)], chartData[chartData.length - 1]]
        : chartData;


    if (chartData.length === 0) {
        return <div style={{...chartStyles.container, justifyContent: 'center', alignItems: 'center', display: 'flex' }}><p>Sin datos de ingresos para este periodo.</p></div>;
    }

    return (
        <div style={chartStyles.container}>
            <h3 style={chartStyles.title}>Ingresos por Día</h3>
            <div style={{ position: 'relative' }}>
                <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
                    <g transform={`translate(${padding.left}, ${padding.top})`}>
                        {/* Grid & Axes */}
                        {yAxisLabels.map(val => (
                            <g key={val}>
                                <line x1="0" y1={yScale(val)} x2={chartWidth} y2={yScale(val)} stroke="var(--border-color)" strokeWidth="1" />
                                <text x="-10" y={yScale(val)} dy="0.3em" textAnchor="end" fill="var(--text-light)" fontSize="12">${val}</text>
                            </g>
                        ))}
                        {xAxisLabels.map((d, i) => (
                            <text key={i} x={xScale(chartData.findIndex(p => p.date === d.date))} y={chartHeight + 20} textAnchor="middle" fill="var(--text-light)" fontSize="12">
                                {new Date(d.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', timeZone: 'UTC' })}
                            </text>
                        ))}
                        {/* Line & Area */}
                        <path d={path} fill="none" stroke="var(--primary-color)" strokeWidth="2.5" />
                        <path d={`M ${xScale(0)} ${chartHeight} ${path} L ${xScale(chartData.length - 1)} ${chartHeight} Z`} fill="url(#gradient)" />
                        <defs>
                            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--primary-color)" stopOpacity="0.3"/>
                                <stop offset="100%" stopColor="var(--primary-color)" stopOpacity="0"/>
                            </linearGradient>
                        </defs>
                        {/* Points & Tooltip Triggers */}
                        {chartData.map((d, i) => (
                            <circle key={d.date} cx={xScale(i)} cy={yScale(d.value)} r="8" fill="transparent"
                                onMouseEnter={() => setTooltip({ x: xScale(i), y: yScale(d.value), ...d })}
                                onMouseLeave={() => setTooltip(null)}
                            />
                        ))}
                    </g>
                </svg>
                {tooltip && (
                    <div style={{...chartStyles.tooltip, left: padding.left + tooltip.x, top: padding.top + tooltip.y }}>
                        <strong>{new Date(tooltip.date).toLocaleDateString('es-MX', {day: 'numeric', month: 'long', timeZone: 'UTC'})}</strong>
                        <div>${tooltip.value.toFixed(2)}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

const chartStyles: { [key: string]: React.CSSProperties } = {
    container: { backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: '12px', height: '100%' },
    title: { margin: '0 0 1.5rem 0', fontWeight: 600 },
    tooltip: { position: 'absolute', transform: 'translate(-50%, -120%)', backgroundColor: 'var(--background-color)', padding: '0.5rem 1rem', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', pointerEvents: 'none', textAlign: 'center', border: '1px solid var(--border-color)', fontSize: '0.9rem' },
};

export default RevenueChart;
