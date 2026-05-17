import React from 'react';
import { Check, X } from 'lucide-react';
import { TagShare } from '../hooks/useAccount';

interface TagSharingTableProps {
    tagshares: TagShare[];
    onRemoveShare: (share: TagShare) => void;
}

export const TagSharingTable: React.FC<TagSharingTableProps> = ({ tagshares, onRemoveShare }) => {
    return (
        <div style={{ marginTop: '2rem', marginBottom: '2rem', width: '95%' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
            }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Tag Sharing</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.85rem',
                    textAlign: 'left'
                }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #eee', color: '#888' }}>
                            <th style={{ padding: '8px 0' }}>Tag Name</th>
                            <th style={{ padding: '8px 0' }}>Owner</th>
                            <th style={{ padding: '8px 0' }}>User</th>
                            <th style={{ padding: '8px 0', textAlign: 'center' }}>RW?</th>
                            <th style={{ padding: '8px 0', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody style={{ textAlign: 'left' }}>
                        {tagshares.map((share, index) => (
                            <tr key={`${share.tag_id}-${index}`} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                <td style={{ padding: '8px 0' }}>{share.tag_name}</td>
                                <td style={{ padding: '8px 0', color: '#666' }}>{share.owner_email}</td>
                                <td style={{ padding: '8px 0', color: '#666' }}>{share.user_email}</td>
                                <td style={{ padding: '8px 0', textAlign: 'center' }}>
                                    {share.access_level === 2 && <Check size={14} color="#4caf50" />}
                                </td>
                                <td style={{ padding: '8px 0', textAlign: 'right' }}>
                                    <X
                                        size={16}
                                        color="#f44336"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => onRemoveShare(share)}
                                    />
                                </td>
                            </tr>
                        ))}
                        {tagshares.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>
                                    No shared tags found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
