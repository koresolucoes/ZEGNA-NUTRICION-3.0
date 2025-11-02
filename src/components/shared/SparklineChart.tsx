import React, { FC } from 'react';

interface SparklineChartProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
}

const SparklineChart: FC<SparklineChartProps> = ({ data, width = 100, height = 30, color = 'var(--primary-color)' }) => {
    if (data.length < 2) {
        return null; // Can't draw a line with less than 2 points
    }

    const values = data;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    const points = values.map((value, index) => {
        const x = (index / (values.length - 1)) * width;
        const y = height - (range > 0 ? ((value - min) / range) * height : height / 2);
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
        </svg>
    );
};

export default SparklineChart;
