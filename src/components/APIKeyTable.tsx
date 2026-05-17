import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { IconButton } from './IconButton';
import { APIKey } from '../hooks/useAccount';

interface APIKeyTableProps {
    apikeys: APIKey[];
    onCreate: () => void;
    onDelete: (id: number) => void;
}

export const APIKeyTable: React.FC<APIKeyTableProps> = ({ apikeys, onCreate, onDelete }) => {
    return (
        <div style={{ marginTop: '2rem', marginBottom: '3rem', width: '95%' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
            }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>API Keys</h3>
                <IconButton
                    icon={Plus}
                    onClick={onCreate}
                    title="Create New API Key"
                    backgroundColor="#0070f3"
                    color="#fff"
                />
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
                            <th style={{ padding: '8px 0' }}>Key</th>
                            <th style={{ padding: '8px 0', textAlign: 'right' }}>Created</th>
                            <th style={{ padding: '8px 0', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody style={{ textAlign: 'left' }}>
                        {apikeys.map(key => (
                            <tr key={key.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                <td style={{ padding: '8px 0', fontFamily: 'monospace' }}>{key.apikey}</td>
                                <td style={{ padding: '8px 0', textAlign: 'right', color: '#666' }}>
                                    {new Date(key.createtime).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '8px 0', textAlign: 'right' }}>
                                    <Trash2
                                        size={16}
                                        color="#d32f2f"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => onDelete(key.id)}
                                    />
                                </td>
                            </tr>
                        ))}
                        {apikeys.length === 0 && (
                            <tr>
                                <td colSpan={3} style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>
                                    No API keys found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
