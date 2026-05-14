import React from 'react';

interface AlertModalProps {
    message: string;
    onClose: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({ message, onClose }) => {
    return (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
            <div className="modal-content" style={{ textAlign: 'center', padding: '2rem' }}>
                <h2 style={{ marginBottom: '1rem', color: '#d32f2f' }}>System Alert</h2>
                <p style={{ marginBottom: '2rem', fontSize: '1.1rem', color: '#333' }}>{message}</p>
                <button
                    onClick={onClose}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#0070f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    );
};
