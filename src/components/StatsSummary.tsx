import React from 'react';
import { StatsSeries } from '../hooks/useStats';

interface StatsSummaryProps {
    stats: StatsSeries[];
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({ stats }) => {
    if (stats.length === 0) return null;

    const summaryData = stats.map(series => {
        const total = series.values.reduce((sum, val) => sum + val, 0);
        const max = Math.max(...series.values);
        return {
            name: series.name,
            total,
            max
        };
    });

    const totalAll = summaryData.reduce((sum, item) => sum + item.total, 0);

    return (
        <div style={{
            width: '100%',
            maxWidth: '600px',
            margin: '0 auto 2rem',
            fontSize: '0.9rem'
        }}>
            <h3 style={{ textAlign: 'center', marginBottom: '1rem', color: '#444' }}>Summary</h3>
            <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.85rem'
            }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #eee', color: '#888' }}>
                        <th style={{ padding: '8px 0' }}>Counter</th>
                        <th style={{ padding: '8px 0', textAlign: 'right' }}>Total</th>
                        <th style={{ padding: '8px 0', textAlign: 'right' }}>Max Bucket</th>
                    </tr>
                </thead>
                <tbody>
                    {summaryData.map((item, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #f9f9f9' }}>
                            <td style={{ padding: '8px 0', color: '#666' }}>{item.name}</td>
                            <td style={{ padding: '8px 0', textAlign: 'right', color: '#666' }}>{item.total}</td>
                            <td style={{ padding: '8px 0', textAlign: 'right', color: '#666' }}>{item.max}</td>
                        </tr>
                    ))}
                    {stats.length > 1 && (
                        <tr style={{
                            fontWeight: 'bold',
                            borderTop: '2px solid #eee'
                        }}>
                            <td style={{ padding: '8px 0', color: '#444' }}>All combined</td>
                            <td style={{ padding: '8px 0', textAlign: 'right', color: '#444' }}>{totalAll}</td>
                            <td style={{ padding: '8px 0', textAlign: 'right', color: '#444' }}>-</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
