import React, { useState, useEffect } from 'react';
import { IconButton } from './components/IconButton';
import { Plus, Edit2, TrendingUp } from 'lucide-react';

export interface Counter {
    id: number;
    name: string;
    step: number;
    count: number;
    archivetime: string | null;
}

interface CounterListProps {
    onEdit: (counter: Counter) => void;
    onCreate: () => void;
    refreshTrigger?: number;
}

export const CounterList: React.FC<CounterListProps> = ({ onEdit, onCreate, refreshTrigger }) => {
    const [counters, setCounters] = useState<Counter[]>([]);
    const [loading, setLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);

    const loadCounters = async () => {
        try {
            const [resCounters, resUpdates] = await Promise.all([
                fetch('/api/counters'),
                fetch('/api/count')
            ]);

            if (!resCounters.ok || !resUpdates.ok) throw new Error('Failed to fetch data');

            const countersData: Array<{ id: number; name: string; step: number; archivetime: string | null }> = await resCounters.json();
            const updates: Array<{ counter: number; delta: number }> = await resUpdates.json();

            // Calculate current counts
            const countersWithCount = countersData.map(c => {
                const count = updates
                    .filter(u => u.counter === c.id)
                    .reduce((sum, u) => sum + u.delta, 0);
                return { ...c, count };
            });

            // MRU Ordering: Most recently updated counters first.
            // Since /api/count returns in insert order, the last occurrence of a counter ID is the most recent.
            const lastUsedMap = new Map<number, number>();
            updates.forEach((u, index) => {
                lastUsedMap.set(u.counter, index);
            });

            const sortedCounters = countersWithCount.sort((a, b) => {
                const aLastUsed = lastUsedMap.get(a.id) ?? -1;
                const bLastUsed = lastUsedMap.get(b.id) ?? -1;
                return bLastUsed - aLastUsed;
            });

            setCounters(sortedCounters);
        } catch (e) {
            console.error('Error loading counters', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCounters();
    }, [refreshTrigger]);

    if (loading) return <div className="loading-text">Loading counters...</div>;

    return (
        <div className="counter-list-container">
            <div className="counter-list-header">
                <h2>Counters</h2>
                <IconButton 
                    icon={Plus} 
                    onClick={onCreate} 
                    title="Create New Counter" 
                    backgroundColor="#0070f3" 
                    color="#fff" 
                />
            </div>

            <table className="counter-table">
                <thead>
                    <tr className="table-header-row">
                        <th className="table-cell">Name</th>
                        <th className="table-cell text-right">Count</th>
                        <th className="table-cell text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {counters.filter(c => showArchived ? c.archivetime !== null : c.archivetime === null).map(c => (
                        <tr key={c.id} className="table-row">
                            <td className="table-cell">{c.name}</td>
                            <td className="table-cell text-right font-bold">{c.count}</td>
                            <td className="table-cell action-cell">
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
            {counters.filter(c => showArchived ? c.archivetime !== null : c.archivetime === null).length === 0 && (
                <p className="empty-text">No counters found. Create one!</p>
            )}
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <button 
                    onClick={() => setShowArchived(!showArchived)} 
                    className="btn-link"
                    style={{ fontSize: '0.9rem', color: '#666', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                    {showArchived ? 'Hide archived counters' : 'Show archived counters'}
                </button>
            </div>
        </div>
    );
};
