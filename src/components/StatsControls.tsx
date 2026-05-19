import React from 'react';
import { Activity, Timer, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { GraphMode, TimeScope } from '../hooks/useStats';

interface StatsControlsProps {
    graphMode: GraphMode;
    setGraphMode: (mode: GraphMode) => void;
    currentScope: TimeScope;
    setCurrentScope: (scope: TimeScope) => void;
    timelineOffset: number;
    setTimelineOffset: (offset: number) => void;
}

export const StatsControls: React.FC<StatsControlsProps> = ({ 
    graphMode, 
    setGraphMode, 
    currentScope, 
    setCurrentScope,
    timelineOffset,
    setTimelineOffset
}) => {
    const getPeriodLabel = () => {
        if (graphMode !== 'timeline') return null;
        
        const now = new Date();
        const offset = timelineOffset;
        
        switch (currentScope) {
            case 'Day': {
                const d = new Date();
                d.setDate(d.getDate() - offset);
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
            case 'Week': {
                const d = new Date();
                d.setDate(d.getDate() - (offset * 7));
                const start = new Date(d);
                start.setDate(start.getDate() - 6);
                return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            }
            case 'Month': {
                const d = new Date();
                d.setMonth(d.getMonth() - offset);
                return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            }
            case 'YTD': {
                const y = new Date().getFullYear() - offset;
                return `${y} Year-to-Date`;
            }
            case 'Year': {
                const y = new Date().getFullYear() - offset - 1;
                return `${y}`;
            }
        }
    };

    return (
        <>
            <div style={{ position: 'absolute', top: '0', right: '16px', display: 'flex', gap: '0.5rem' }}>
                <button
                    onClick={() => setGraphMode('frequency')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px',
                        backgroundColor: graphMode === 'frequency' ? '#0070f3' : 'transparent',
                        color: graphMode === 'frequency' ? '#fff' : 'inherit',
                        border: '1px solid #0070f3',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                    title="Frequency"
                >
                    <Activity size={20} />
                </button>
                <button
                    onClick={() => setGraphMode('timeline')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px',
                        backgroundColor: graphMode === 'timeline' ? '#0070f3' : 'transparent',
                        color: graphMode === 'timeline' ? '#fff' : 'inherit',
                        border: '1px solid #0070f3',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                    title="Timeline"
                >
                    <Timer size={20} />
                </button>
            </div>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '15px',
                margin: '1rem auto',
                width: 'fit-content'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '10px',
                }}>
                    {['Day', 'Week', 'Month', 'YTD', 'Year'].map(scope => (
                        <button
                            key={scope}
                            onClick={() => setCurrentScope(scope as TimeScope)}
                            style={{
                                padding: '5px 12px',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                backgroundColor: currentScope === scope ? '#0070f3' : '#fff',
                                color: currentScope === scope ? '#fff' : '#666',
                                cursor: 'pointer',
                                fontWeight: currentScope === scope ? 'bold' : 'normal',
                                fontSize: '0.8rem'
                            }}
                        >
                            {scope}
                        </button>
                    ))}
                </div>

                {graphMode === 'timeline' && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '0.8rem',
                        color: '#666'
                    }}>
                        <button 
                            onClick={() => setTimelineOffset(prev => Math.max(0, prev + 100))}
                            style={{ 
                                padding: '2px 8px', 
                                cursor: 'pointer', 
                                borderRadius: '4px', 
                                border: '1px solid #ccc',
                                backgroundColor: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#666'
                            }}
                            title="Skip to start"
                        >
                            <ChevronsLeft size={16} />
                        </button>
                        <button 
                            onClick={() => setTimelineOffset(prev => Math.max(0, prev + 1))}
                            style={{ 
                                padding: '2px 8px', 
                                cursor: 'pointer', 
                                borderRadius: '4px', 
                                border: '1px solid #ccc',
                                backgroundColor: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#666'
                            }}
                            title="Previous"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span style={{ minWidth: '120px', textAlign: 'center', fontWeight: 'bold', color: '#333' }}>
                            {getPeriodLabel()}
                        </span>
                        <button 
                            onClick={() => setTimelineOffset(prev => Math.max(0, prev - 1))}
                            style={{ 
                                padding: '2px 8px', 
                                cursor: 'pointer', 
                                borderRadius: '4px', 
                                border: '1px solid #ccc',
                                backgroundColor: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#666'
                            }}
                            title="Next"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <button 
                            onClick={() => setTimelineOffset(0)}
                            style={{ 
                                padding: '2px 8px', 
                                cursor: 'pointer', 
                                borderRadius: '4px', 
                                border: '1px solid #ccc',
                                backgroundColor: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#666'
                            }}
                            title="Skip to end"
                        >
                            <ChevronsRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};
