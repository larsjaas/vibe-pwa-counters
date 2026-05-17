import React from 'react';
import { Check, X, Trash2 } from 'lucide-react';
import { TagInvite } from '../hooks/useAccount';

interface InvitesTableProps {
    invites: TagInvite[];
    onAccept: (id: number) => void;
    onReject: (id: number) => void;
    onRetract: (id: number) => void;
}

export const InvitesTable: React.FC<InvitesTableProps> = ({ invites, onAccept, onReject, onRetract }) => {
    return (
        <div style={{ marginTop: '2rem', marginBottom: '2rem', width: '95%' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
            }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Invites</h3>
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
                            <th style={{ padding: '8px 0' }}>User</th>
                            <th style={{ padding: '8px 0', textAlign: 'center' }}>RW?</th>
                            <th style={{ padding: '8px 0', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody style={{ textAlign: 'left' }}>
                        {invites.map((invite, index) => (
                            <tr key={`${invite.id}-${index}`} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                <td style={{ padding: '8px 0' }}>{invite.tag_name}</td>
                                <td style={{ padding: '8px 0', color: '#666' }}>{invite.other_party_email}</td>
                                <td style={{ padding: '8px 0', textAlign: 'center' }}>
                                    {invite.access_level === 2 && <Check size={14} color="#4caf50" />}
                                    </td>
                                    <td style={{ padding: '8px 0', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                        {!invite.is_sender ? (
                                            <>
                                                <Check
                                                    size={16}
                                                    color="#4caf50"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => onAccept(invite.id)}
                                                />
                                                <X
                                                    size={16}
                                                    color="#f44336"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => onReject(invite.id)}
                                                />
                                            </>
                                        ) : (
                                            <Trash2
                                                size={16}
                                                color="#888"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => onRetract(invite.id)}
                                            />
                                        )}
                                    </td>
                                </tr>
                        ))}
                        {invites.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>
                                    No pending invites.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
