import React, { useState, useEffect } from 'react';
import { Counter, Tag } from '../types';
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Count {
    id: number;
    counter: number;
    delta: number;
    when?: string;
    user_email?: string;
}

interface RecentActivityTableProps {
    counterIds: number[];
    counters: Counter[];
    counts: Count[];
    currentUserEmail: string | null;
    onDelete: (id: number) => void;
    onEdit?: (id: number, when: string) => void;
    limit?: number;
    title?: string;
    compact?: boolean;
}

export const RecentActivityTable: React.FC<RecentActivityTableProps> = ({
    counterIds,
    counters,
    counts,
    currentUserEmail,
    onDelete,
    onEdit,
    limit = 5,
    title,
    compact = false
}) => {
    const [currentPage, setCurrentPage] = useState(0);

    const allFilteredCounts = (counts || [])
        .filter(c => counterIds?.includes(c.counter))
        .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

    const filteredCounts = allFilteredCounts.slice(
        currentPage * limit,
        (currentPage + 1) * limit
    );

    const totalPages = Math.ceil(allFilteredCounts.length / limit);

    if (allFilteredCounts.length === 0) {
        return (
            <div style={{ textAlign: 'center', color: '#999', padding: '1rem 0', fontSize: '0.85rem' }}>
                No activity recorded for this counter.
            </div>
        );
    }

    return (
        <div style={{
            width: '100%',
            fontSize: compact ? '0.8rem' : '0.9rem'
        }}>
            {title && <h3 style={{ textAlign: 'center', marginBottom: '1rem', color: '#444' }}>{title}</h3>}
            <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: compact ? '0.75rem' : '0.85rem'
            }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #eee', color: '#888' }}>
                        <th style={{ padding: '8px 0' }}>Time</th>
                        {counterIds.length > 1 && <th style={{ padding: '8px 0' }}>Which</th>}
                        <th style={{ padding: '8px 0' }}>Who</th>
                        <th style={{ padding: '8px 0', textAlign: 'right' }}>Delta</th>
                        <th style={{ padding: '8px 0', textAlign: 'right' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {filteredCounts.map((entry) => (
                        <tr key={entry.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                            <td style={{ padding: '8px 0', color: '#666' }}>
                                {new Date(entry.when).toLocaleString()}
                            </td>
                            {counterIds.length > 1 && (
                                <td style={{ padding: '8px 0', color: '#666' }}>
                                    {counters.find(c => c.id === entry.counter)?.name || 'Unknown'}
                                </td>
                            )}
                            <td style={{ padding: '8px 0', color: '#666' }}>
                                {entry.user_email}
                            </td>
                            <td style={{
                                padding: '8px 0',
                                textAlign: 'right',
                                fontWeight: 'bold',
                                color: entry.delta >= 0 ? '#2ecc71' : '#e74c3c'
                            }}>
                                {entry.delta === 0 ? 'reset' : (entry.delta > 0 ? `+${entry.delta}` : entry.delta)}
                            </td>
                            <td style={{ padding: '8px 0', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                                {entry.user_email === currentUserEmail && onEdit && (
                                    <Pencil
                                        size={14}
                                        color="#666"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => onEdit(entry.id, entry.when)}
                                    />
                                )}
                                <Trash2
                                    size={14}
                                    color="#d32f2f"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => onDelete(entry.id)}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {totalPages > 1 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '10px',
                    marginTop: '10px',
                    fontSize: compact ? '0.7rem' : '0.8rem',
                    color: '#888'
                }}>
                    <button
                        disabled={currentPage === 0}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: currentPage === 0 ? 'default' : 'pointer',
                            padding: '2px',
                            color: currentPage === 0 ? '#ccc' : '#666',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <span>Page {currentPage + 1} of {totalPages}</span>
                    <button
                        disabled={currentPage === totalPages - 1}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: currentPage === totalPages - 1 ? 'default' : 'pointer',
                            padding: '2px',
                            color: currentPage === totalPages - 1 ? '#ccc' : '#666',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};
