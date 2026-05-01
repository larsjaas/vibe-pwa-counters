import React from 'react';

interface ConfirmationModalProps {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    message, 
    onConfirm, 
    onCancel, 
    confirmText = 'Confirm', 
    cancelText = 'Cancel' 
}) => {
    return (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
            <div className="modal-content" style={{ textAlign: 'center', padding: '2rem' }}>
                <h2 style={{ marginBottom: '1rem', color: 'var(--color-text)' }}>Confirmation</h2>
                <p style={{ marginBottom: '2rem', fontSize: '1.1rem', color: '#333' }}>{message}</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <button 
                        onClick={onCancel} 
                        style={{ 
                            padding: '10px 20px', 
                            backgroundColor: '#ccc', 
                            color: '#333', 
                            border: 'none', 
                            borderRadius: '5px', 
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={onConfirm} 
                        style={{ 
                            padding: '10px 20px', 
                            backgroundColor: 'var(--color-primary)', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '5px', 
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
