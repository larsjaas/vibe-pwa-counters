import React, { useState } from 'react';

interface CounterCreateProps {
    onCreated: () => void;
    onCancel: () => void;
}

export const CounterCreate: React.FC<CounterCreateProps> = ({ onCreated, onCancel }) => {
    const [name, setName] = useState('');
    const [initial, setInitial] = useState(0);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/counters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, initial, step }),
            });

            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            
            const newCounter = await res.json();

            // If initial value is non-zero, set it by posting a delta
            if (initial !== 0) {
                await fetch('/api/count', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ counter: newCounter.id, delta: initial }),
                });
            }

            onCreated();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create counter');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
            <h2>Create Counter</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Name:</label>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        required 
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Initial Value:</label>
                    <input 
                        type="number" 
                        value={initial} 
                        onChange={(e) => setInitial(parseInt(e.target.value) || 0)} 
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Step:</label>
                    <input 
                        type="number" 
                        value={step} 
                        onChange={(e) => setStep(parseInt(e.target.value) || 1)} 
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>

                {error && <div style={{ color: 'red', fontSize: '0.9em' }}>{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button type="button" onClick={onCancel} disabled={loading}>Cancel</button>
                    <button 
                        type="submit" 
                        disabled={loading} 
                        style={{ background: '#0070f3', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        {loading ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </form>
        </div>
    );
};
