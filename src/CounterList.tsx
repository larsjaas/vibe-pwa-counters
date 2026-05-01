import React, { useState, useEffect } from 'react';
import { IconButton } from './components/IconButton';
import { Plus, Edit2, SquareCheckBig, Search, X, UserRoundPlus } from 'lucide-react';
import { TagSharingModal } from './components/TagSharingModal';

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
    const [counterTags, setCounterTags] = useState<Record<number, string[]>>({});
    const [allTags, setAllTags] = useState<{ id: number; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTagForSharing, setSelectedTagForSharing] = useState<{ id: number; name: string } | null>(null);

    const loadCounters = async () => {
        try {
            const [resCounters, resUpdates, resTags] = await Promise.all([
                fetch('/api/counters'),
                fetch('/api/counts'),
                fetch('/api/tags')
            ]);

            if (!resCounters.ok || !resUpdates.ok || !resTags.ok) throw new Error('Failed to fetch data');

            const countersData: Array<{ id: number; name: string; step: number; archivetime: string | null }> = await resCounters.json();
            const updatesData = await resUpdates.json();
            const tagsData: Array<{ id: number; name: string }> = await resTags.json();
            setAllTags(tagsData);
            const updates: Array<{ counter: number; delta: number }> = updatesData || [];

            // Load tag associations
            const tagMap: Record<number, string[]> = {};
            await Promise.all(tagsData.map(async (tag) => {
                const res = await fetch(`/api/tags/${tag.id}/counters`);
                if (res.ok) {
                    const cids: number[] = await res.json();
                    cids.forEach(cid => {
                        if (!tagMap[cid]) tagMap[cid] = [];
                        tagMap[cid].push(tag.name);
                    });
                }
            }));
            setCounterTags(tagMap);

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
        .filter(c => {
            const query = searchQuery.toLowerCase();
            if (!query) return true;

            const tags = counterTags[c.id] || [];
            
            // Check if the query matches ANY tag globally
            const isGlobalExactTagMatch = allTags.some(tag => tag.name.toLowerCase() === query);
            
            if (isGlobalExactTagMatch) {
                // Only show counters that have this exact tag
                return tags.some(tag => tag.toLowerCase() === query);
            }

            // Otherwise, use the "contains" logic for both name and tags
            const nameMatch = c.name.toLowerCase().includes(query);
            const tagMatch = tags.some(tag => tag.toLowerCase().includes(query));
            return nameMatch || tagMatch;
        });
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
                    placeholder="Filter counters..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="search-actions">
                    {allTags.some(t => t.name.toLowerCase() === searchQuery.toLowerCase()) && (
                        <button 
                            className="search-action-btn" 
                            onClick={() => {
                               const tag = allTags.find(t => t.name.toLowerCase() === searchQuery.toLowerCase());
                               if (tag) setSelectedTagForSharing(tag);
                            }}
                            title="Manage Tag Sharing"
                        >
                            <UserRoundPlus size={18} />
                        </button>
                    )}
                    {searchQuery && (
                        <button 
                            className="search-action-btn" 
                            onClick={() => setSearchQuery('')}
                            title="Clear search"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {allTags.length > 0 && (
                <div className="tags-filter-container">
                    {allTags
                        .filter(tag => !searchQuery.toLowerCase().includes(tag.name.toLowerCase()))
                        .map(tag => (
                            <span 
                                key={tag.id} 
                                className="tag-filter-label" 
                                onClick={() => setSearchQuery(tag.name)}
                            >
                                {tag.name}
                            </span>
                        ))
                    }
                </div>
            )}

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

            {selectedTagForSharing && (
                <TagSharingModal 
                    tagId={selectedTagForSharing.id}
                    tagName={selectedTagForSharing.name}
                    onClose={() => setSelectedTagForSharing(null)}
                />
            )}
        </div>
    );
};
