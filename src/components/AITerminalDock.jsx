import { useState } from 'react';
import { Bot, X, MessageSquare, Mic, Send, Command } from 'lucide-react';
import OpenCloudChat from './OpenCloudChat';

export default function AITerminalDock() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '16px'
        }}>
            {/* The Chat Window */}
            {isOpen && (
                <div 
                    className="card animate-in-up" 
                    style={{
                        width: '380px',
                        height: '500px',
                        overflow: 'hidden',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                        border: '1px solid var(--accent-primary)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <OpenCloudChat onClose={() => setIsOpen(false)} />
                </div>
            )}

            {/* Floating Action Button */}
            {!isOpen && (
                <button
                    className="pulse"
                    onClick={() => setIsOpen(true)}
                    style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '28px',
                        background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-purple) 100%)',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <Command size={24} />
                    {/* Notification dot */}
                    <span style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        width: '10px',
                        height: '10px',
                        backgroundColor: 'var(--accent-green)',
                        borderRadius: '50%',
                        border: '2px solid var(--accent-purple)'
                    }}></span>
                </button>
            )}
        </div>
    );
}
