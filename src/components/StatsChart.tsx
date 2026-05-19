import { StatsSeries } from '../hooks/useStats';

interface StatsChartProps {
    stats: StatsSeries[];
    currentScope: string;
    graphMode: 'frequency' | 'timeline';
}

export const StatsChart: React.FC<StatsChartProps> = ({ stats, currentScope, graphMode }) => {
    const numBuckets = stats.length > 0 ? stats[0].values.length : 0;
    const bucketTotals = new Array(numBuckets).fill(0);
    stats.forEach(s => {
        s.values.forEach((v, i) => {
            bucketTotals[i] += v;
        });
    });
    const maxStats = Math.max(0, ...bucketTotals);
    
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

    const COLORS = [
        '#0070f3', '#e91e63', '#4caf50', '#ff9800', '#9c27b0', 
        '#00bcd4', '#f44336', '#795548', '#607d8b', '#ffeb3b'
    ];

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: '650px',
            margin: '0 auto',
            paddingBottom: '20px',
            borderBottom: '2px solid #eee'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                width: '100%',
                marginBottom: '20px'
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
                    {bucketTotals.map((total, index) => {
                        const getLabel = () => {
                            if (graphMode === 'frequency') {
                                switch (currentScope) {
                                    case 'Day': return `${index}:00`;
                                    case 'Week': return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index] || '';
                                    case 'Month': return `${index + 1}`;
                                    case 'YTD':
                                    case 'Year': return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index] || '';
                                    default: return `${index}`;
                                }
                            } else {
                                switch (currentScope) {
                                    case 'Day': return `${index}:00`;
                                    case 'Week': {
                                        const date = new Date(Date.now() - (7 - index) * 24 * 60 * 60 * 1000);
                                        return date.toLocaleDateString('en-US', { weekday: 'short' });
                                    }
                                    case 'Month': {
                                        const date = new Date(Date.now() - (30 - index) * 24 * 60 * 60 * 1000);
                                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                    }
                                    case 'YTD': return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index] || '';
                                    case 'Year': {
                                        const date = new Date();
                                        date.setMonth(date.getMonth() - 11 + index);
                                        return date.toLocaleDateString('en-US', { month: 'short' });
                                    }
                                    default: return `${index}`;
                                }
                            }
                        };

                        return (
                            <div key={index} style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column-reverse',
                                height: '180px',
                                justifyContent: 'flex-start',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.title = `${getLabel()} - ${total} actions`;
                            }}>
                                {stats.map((series, sIdx) => {
                                    const val = series.values[index] || 0;
                                    const height = maxStats === 0 ? 0 : (val / maxStats) * 100;
                                    return (
                                        <div key={sIdx} style={{
                                            width: '100%',
                                            backgroundColor: COLORS[sIdx % COLORS.length],
                                            height: `${height}%`,
                                            minHeight: val > 0 ? '2px' : '0px',
                                            borderRadius: sIdx === stats.length - 1 && val > 0 ? '4px 4px 0 0' : '0',
                                            borderTop: '0.5px solid rgba(255,255,255,0.2)'
                                        }} />
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '15px',
                marginTop: '15px',
                fontSize: '0.8rem',
                color: '#666'
            }}>
                {stats.map((series, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: COLORS[sIdx % COLORS.length],
                            borderRadius: '2px'
                        }} />
                        <span>{series.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
