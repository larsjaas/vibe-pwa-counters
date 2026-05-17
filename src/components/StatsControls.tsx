import React from 'react';
import { Activity, Timer } from 'lucide-react';
import { GraphMode, TimeScope } from '../hooks/useStats';

interface StatsControlsProps {
    graphMode: GraphMode;
    setGraphMode: (mode: GraphMode) => void;
    currentScope: TimeScope;
    setCurrentScope: (scope: TimeScope) => void;
}

export const StatsControls: React.FC<StatsControlsProps> = ({ 
    graphMode, 
    setGraphMode, 
    currentScope, 
    setCurrentScope 
}) => {
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
                justifyContent: 'center',
                gap: '10px',
                margin: '1rem auto',
                width: 'fit-content'
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
        </>
    );
};
