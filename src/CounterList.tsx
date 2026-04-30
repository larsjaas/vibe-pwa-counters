import React, { useState, useEffect } from 'react';
import { IconButton } from './components/IconButton';
import { Plus, Edit2, SquareCheckBig, Search } from 'lucide-react';

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
    const [searchQuery, setSearchQuery] = useState('');

    const loadCounters = async () => {
        try {
            const [resCounters, resUpdates] = await Promise.all([
                fetch('/api/counters'),
                fetch('/api/counts')
            ]);

            if (!resCounters.ok || !resUpdates.ok) throw new Error('Failed to fetch data');

            const countersData: Array<{ id: number; name: string; step: number; archivetime: string | null }> = await resCounters.json();
            const updatesData = await resUpdates.json();
            const updates: Array<{ counter: number; delta: number }> = updatesData || [];

            // Calculate current counts
            const countersWithCount = countersData.map(c => {
                const count = updates
                    .filter(u => u.counter === c.id)
                    .reduce((sum, u) => sum + u.delta, 0);
                return { ...c, count };
            });

            // MRU Ordering: Most recently updated counters first.
            // Since /api/counts returns in insert order, the last occurrence of a counter ID is the most recent.
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

    const nonArchived = counters.filter(c => c.archivetime === null);
    const archived = counters.filter(c => c.archivetime !== null);
    const filteredCounters = (showArchived ? [...nonArchived, ...archived] : nonArchived)
        .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const displayCounters = filteredCounters;

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

            <div className="search-input-container">
                <Search className="search-icon" size={20} />
                <input 
                    type="text" 
                    className="search-input" 
                    placeholder="Search counters..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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
                    {displayCounters.map(c => (
                        <tr key={c.id} className="table-row">
                            <td className="table-cell">{c.name}</td>
                            <td className="table-cell text-right font-bold">{c.count}</td>
                            <td className="table-cell action-cell">
                                <IconButton 
                                    icon={SquareCheckBig} 
                                    onClick={async () => {
                                        await fetch('/api/counts', {
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
            {displayCounters.length === 0 && (
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
