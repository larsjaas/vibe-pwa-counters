import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';

export const VerifyEmailPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setStatus('error');
            setMessage('No verification token provided.');
            return;
        }

        const verify = async () => {
            try {
                await api.verifyNotificationEmail(token);
                setStatus('success');
                setMessage('Your notification email address has been successfully verified!');
            } catch (e: any) {
                setStatus('error');
                setMessage(e.message || 'An error occurred while verifying your email.');
            }
        };

        verify();
    }, [searchParams]);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            fontFamily: 'sans-serif',
            textAlign: 'center',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '400px',
                padding: '2rem',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                backgroundColor: 'white'
            }}>
                {status === 'pending' && <h2>Verifying your email...</h2>}
                {status === 'success' && (
                    <>
                        <h2 style={{ color: '#4caf50' }}>Verification Successful!</h2>
                        <p>{message}</p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <h2 style={{ color: '#f44336' }}>Verification Failed</h2>
                        <p>{message}</p>
                    </>
                )}
            </div>
        </div>
    );
};
