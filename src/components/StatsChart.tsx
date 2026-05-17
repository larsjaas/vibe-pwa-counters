import React from 'react';

interface StatsChartProps {
    stats: number[];
    currentScope: string;
}

export const StatsChart: React.FC<StatsChartProps> = ({ stats, currentScope }) => {
    const maxStats = Math.max(...stats);
    
    const getLabels = (max: number) => {
        if (max === 0) return [0];
        if (max === 1) return [0, 1];
        let step: number;
        if (max <= 4) step = 1;
        else if (max <= 9) step = 2;
        else if (max <= 19) step = 5;
        else if (max <= 49) step = 10;
        else if (max <= 124) step = 25;
        else if (max <= 249) step = 50;
        else if (max <= 499) step = 100;
        else if (max <= 999) step = 250;
        else step = 500;
        const labels = [];
        for (let v = 0; v < max; v += step) labels.push(v);
        labels.push(max);
        return labels;
    };

    const labels = getLabels(maxStats);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '650px',
            margin: '0 auto',
            paddingBottom: '20px',
            borderBottom: '2px solid #eee'
        }}>
            {/* Y Axis */}
            <div style={{
                position: 'relative',
                height: '180px',
                width: '40px',
                marginBottom: '0px',
                display: 'flex',
                justifyContent: 'flex-end'
            }}>
                <div style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '1px',
                    backgroundColor: '#ccc'
                }} />
                {labels.map(l => {
                    const pos = maxStats === 0 ? 0 : (l / maxStats) * 100;
                    return (
                        <div key={l} style={{
                            position: 'absolute',
                            bottom: `${pos}%`,
                            right: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            width: '40px',
                            fontSize: '0.7rem',
                            color: '#666',
                            pointerEvents: 'none',
                            transform: 'translateY(50%)'
                        }}>
                            <span style={{ marginRight: '4px' }}>{l}</span>
                            <div style={{
                                width: '4px',
                                height: '1px',
                                backgroundColor: '#ccc'
                            }} />
                        </div>
                    );
                })}
            </div>
            {/* Bars */}
            <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: '4px',
                height: '180px',
                width: '100%',
                maxWidth: '600px',
            }}>
                {stats.map((value, index) => (
                    <div key={index} style={{
                        flex: 1,
                        backgroundColor: '#0070f3',
                        height: `${(value / (maxStats || 1)) * 100}%`,
                        minHeight: '2px',
                        borderRadius: '4px 4px 0 0',
                        position: 'relative',
                        cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.title = `${index}:00 - ${value} actions`;
                    }}
                    />
                ))}
            </div>
        </div>
    );
};
