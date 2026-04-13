import React, { useState, useEffect } from 'react';
import { IconButton } from './components/IconButton';
import { Plus, Edit2, TrendingUp } from 'lucide-react';

export interface Counter {
    id: number;
    name: string;
    step: number;
    count: number;
}

interface CounterListProps {
    onEdit: (counter: Counter) => void;
    onCreate: () => void;
}

export const CounterList: React.FC<CounterListProps> = ({ onEdit, onCreate }) => {
    const [counters, setCounters] = useState<Counter[]>([]);
    const [loading, setLoading] = useState(true);

    const loadCounters = async () => {
        try {
            const [resCounters, resUpdates] = await Promise.all([
                fetch('/api/counters'),
                fetch('/api/count')
            ]);

            if (!resCounters.ok || !resUpdates.ok) throw new Error('Failed to fetch data');

            const countersData: Array<{ id: number; name: string; step: number }> = await resCounters.json();
            const updates: Array<{ counter: number; delta: number }> = await resUpdates.json();

            const countersWithCount = countersData.map(c => {
                const count = updates
                    .filter(u => u.counter === c.id)
                    .reduce((sum, u) => sum + u.delta, 0);
                return { ...c, count };
            });

            setCounters(countersWithCount);
        } catch (e) {
            console.error('Error loading counters', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCounters();
    }, []);

    if (loading) return <div style={{ padding: '20px' }}>Loading counters...</div>;

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Counters</h2>
                <IconButton 
                    icon={Plus} 
                    onClick={onCreate} 
                    title="Create New Counter" 
                    backgroundColor="#0070f3" 
                    color="#fff" 
                />
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.2em' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                        <th style={{ padding: '10px' }}>Name</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Count</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {counters.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '10px' }}>{c.name}</td>
                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{c.count}</td>
                            <td style={{ padding: '10px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <IconButton 
                                    icon={TrendingUp} 
                                    onClick={async () => {
                                        await fetch('/api/count', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ counter: c.id, delta: c.step }),
                                        });
                                        loadCounters();
                                    }} 
                                    title="Increment" 
                                />
                                <IconButton 
                                    icon={Edit2} 
                                    onClick={() => onEdit(c)} 
                                    title="Edit" 
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {counters.length === 0 && <p style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>No counters found. Create one!</p>}
        </div>
    );
};
