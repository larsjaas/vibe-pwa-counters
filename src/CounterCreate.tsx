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
        <div className="form-container">
            <h2 className="form-title">Create Counter</h2>
            <form onSubmit={handleSubmit} className="form-group">
                <div className="form-field">
                    <label className="form-label">Name:</label>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        required 
                        className="form-input"
                    />
                </div>
                <div className="form-field">
                    <label className="form-label">Initial Value:</label>
                    <input 
                        type="number" 
                        value={initial} 
                        onChange={(e) => setInitial(parseInt(e.target.value) || 0)} 
                        className="form-input"
                    />
                </div>
                <div className="form-field">
                    <label className="form-label">Step:</label>
                    <input 
                        type="number" 
                        value={step} 
                        onChange={(e) => setStep(parseInt(e.target.value) || 1)} 
                        className="form-input"
                    />
                </div>

                {error && <div className="form-error">{error}</div>}

                <div className="form-actions">
                    <button type="button" onClick={onCancel} disabled={loading}>Cancel</button>
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="btn-primary"
                    >
                        {loading ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </form>
        </div>
    );
};
