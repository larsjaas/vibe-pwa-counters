import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

export interface Count {
    id: number;
    counter: number;
    delta: number;
    when?: string;
    user_email?: string;
}

interface RecentActivityTableProps {
    counterId: number;
    counts: Count[];
    currentUserEmail: string | null;
    onDelete: (id: number) => void;
    onEdit?: (id: number, when: string) => void;
    limit?: number;
    title?: string;
    compact?: boolean;
}

export const RecentActivityTable: React.FC<RecentActivityTableProps> = ({
    counterId,
    counts,
    currentUserEmail,
    onDelete,
    onEdit,
    limit = 5,
    title,
    compact = false
}) => {
    const filteredCounts = counts
        .filter(c => c.counter === counterId)
        .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
        .slice(0, limit);

    if (filteredCounts.length === 0) {
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
        </div>
    );
};
