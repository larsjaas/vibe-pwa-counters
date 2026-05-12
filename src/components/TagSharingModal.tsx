import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Check, Focus } from 'lucide-react';

interface TagSharingModalProps {
    tagId: number;
    tagName: string;
    onClose: () => void;
}

export const TagSharingModal: React.FC<TagSharingModalProps> = ({ tagId, tagName, onClose }) => {
    const [shares, setShares] = useState<{ email: string; access_level: number }[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [accessLevel, setAccessLevel] = useState<'RO' | 'RW'>('RO');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [focusMode, setFocusMode] = useState(false);

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

    const fetchFocusMode = async () => {
        try {
            const res = await fetch(`/api/tags/${tagId}/settings?key=focus_mode`);
            if (!res.ok) return;
            const data = await res.json();
            setFocusMode(data.focus_mode === 'true');
        } catch {
            // Silently ignore – focus mode defaults to false
        }
    };

    useEffect(() => {
        fetchShares();
        fetchFocusMode();
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
                body: JSON.stringify({ 
                    email: newEmail, 
                    access_level: accessLevel === 'RW' ? 2 : 1 
                }),
            });
            if (!res.ok) throw new Error('Failed to share tag');
            setNewEmail('');
            setAccessLevel('RO');
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

    const handleFocusModeToggle = async () => {
        const newValue = !focusMode;
        setFocusMode(newValue);
        try {
            const res = await fetch(`/api/tags/${tagId}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ setting: 'focus_mode', value: String(newValue) }),
            });
            if (!res.ok) {
                setFocusMode(!newValue);
                throw new Error('Failed to update focus mode');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error updating focus mode');
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
                        style={{ flex: 2 }}
                    />
                    <select 
                        className="form-input" 
                        value={accessLevel} 
                        onChange={(e) => setAccessLevel(e.target.value as 'RO' | 'RW')}
                        style={{ width: '70px' }}
                    >
                        <option value="RO">RO</option>
                        <option value="RW">RW</option>
                    </select>
                    <button type="submit" disabled={loading} className="btn-primary">
                        <UserPlus size={18} />
                    </button>
                </form>

                {error && <div className="form-error" style={{ marginBottom: '10px' }}>{error}</div>}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Focus size={18} />
                        <span>Focus Mode</span>
                    </div>
                    <button
                        onClick={handleFocusModeToggle}
                        className={focusMode ? 'btn-primary' : 'btn-secondary'}
                        style={{ minWidth: '60px' }}
                        title={focusMode ? 'Disable Focus Mode' : 'Enable Focus Mode'}
                    >
                        {focusMode ? 'ON' : 'OFF'}
                    </button>
                </div>

                <table className="counter-table" style={{ fontSize: '1rem' }}>
                    <thead className="table-header-row">
                        <tr>
                            <th className="table-cell">Email Address</th>
                            <th className="table-cell text-center">RW</th>
                            <th className="table-cell text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shares.map(share => (
                            <tr key={share.email} className="table-row">
                               <td className="table-cell">{share.email}</td>
                               <td className="table-cell text-center">
                                   {share.access_level === 2 && <Check size={16} style={{ color: 'green' }} />}
                               </td>
                               <td className="table-cell text-right">
                                   <button 
                                       onClick={() => handleRemoveUser(share.email)} 
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
                               <td colSpan={3} className="empty-text">No shared users.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
