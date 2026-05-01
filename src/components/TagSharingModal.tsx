import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2 } from 'lucide-react';

interface TagSharingModalProps {
    tagId: number;
    tagName: string;
    onClose: () => void;
}

export const TagSharingModal: React.FC<TagSharingModalProps> = ({ tagId, tagName, onClose }) => {
    const [shares, setShares] = useState<string[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchShares = async () => {
        try {
            const res = await fetch(`/api/tags/${tagId}/shares`);
            if (!res.ok) throw new Error('Failed to fetch shares');
            const data = await res.json();
            setShares(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load shares');
        }
    };

    useEffect(() => {
        fetchShares();
    }, [tagId]);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/tags/${tagId}/shares`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail }),
            });
            if (!res.ok) throw new Error('Failed to share tag');
            setNewEmail('');
            await fetchShares();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error adding user');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveUser = async (email: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/tags/${tagId}/shares/${encodeURIComponent(email)}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to remove user');
            await fetchShares();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error removing user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0 }}>Sharing: {tagName}</h2>
                    <button onClick={onClose} className="btn-secondary" style={{ padding: '4px' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleAddUser} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <input 
                        type="email" 
                        className="form-input" 
                        placeholder="User email..." 
                        value={newEmail} 
                        onChange={(e) => setNewEmail(e.target.value)} 
                        required
                        style={{ flex: 1 }}
                    />
                    <button type="submit" disabled={loading} className="btn-primary">
                        <UserPlus size={18} />
                    </button>
                </form>

                {error && <div className="form-error" style={{ marginBottom: '10px' }}>{error}</div>}

                <table className="counter-table" style={{ fontSize: '1rem' }}>
                    <thead className="table-header-row">
                        <tr>
                            <th className="table-cell">Email Address</th>
                            <th className="table-cell text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shares.map(email => (
                            <tr key={email} className="table-row">
                                <td className="table-cell">{email}</td>
                                <td className="table-cell text-right">
                                    <button 
                                        onClick={() => handleRemoveUser(email)} 
                                        className="btn-secondary" 
                                        style={{ color: 'var(--color-error)' }}
                                        title="Remove Access"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {shares.length === 0 && (
                            <tr>
                                <td colSpan={2} className="empty-text">No shared users.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
