import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, X, Loader } from 'lucide-react';
import '../styles/Toast.css';

const ConfirmToastContext = createContext(null);

export const useConfirmToast = () => {
    const context = useContext(ConfirmToastContext);
    if (!context) {
        throw new Error('useConfirmToast must be used within ConfirmToastProvider');
    }
    return context;
};

export const ConfirmToastProvider = ({ children }) => {
    const [confirmQueue, setConfirmQueue] = useState([]);

    const showConfirm = (options) => {
        return new Promise((resolve) => {
            const id = Date.now();
            setConfirmQueue(prev => [...prev, { 
                id, 
                resolve, 
                title: options.title || 'Confirm', 
                message: options.message || 'Are you sure?',
                confirmText: options.confirmText || 'Yes',
                cancelText: options.cancelText || 'No',
                type: options.type || 'warning'
            }]);
        });
    };

    const handleConfirm = (id, result) => {
        setConfirmQueue(prev => {
            const item = prev.find(q => q.id === id);
            if (item) {
                item.resolve(result);
            }
            return prev.filter(q => q.id !== id);
        });
    };

    const getColors = (type) => {
        switch (type) {
            case 'danger': return { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#ef4444' };
            case 'warning': return { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#f59e0b' };
            default: return { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', text: '#3b82f6' };
        }
    };

    return (
        <ConfirmToastContext.Provider value={{ showConfirm }}>
            {children}
            <div className="toast-container">
                <AnimatePresence>
                    {confirmQueue.map((q) => {
                        const colors = getColors(q.type);
                        return (
                            <motion.div
                                key={q.id}
                                className="toast"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                style={{ 
                                    borderLeftColor: colors.border,
                                    background: `linear-gradient(135deg, rgba(20, 20, 30, 0.98) 0%, ${colors.bg} 100%)`,
                                }}
                            >
                                <span style={{ color: colors.text }}><AlertTriangle size={20} /></span>
                                <div className="toast-content">
                                    <p className="toast-title">{q.title}</p>
                                    <p className="toast-message">{q.message}</p>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                        <button 
                                            className="btn-ghost"
                                            onClick={() => handleConfirm(q.id, false)}
                                            style={{ 
                                                fontSize: '0.85rem', 
                                                padding: '6px 12px',
                                                background: 'rgba(255,255,255,0.1)',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                borderRadius: '6px'
                                            }}
                                        >
                                            {q.cancelText}
                                        </button>
                                        <button 
                                            onClick={() => handleConfirm(q.id, true)}
                                            style={{ 
                                                background: colors.text, 
                                                color: '#000', 
                                                border: 'none',
                                                fontSize: '0.85rem', 
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {q.confirmText}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </ConfirmToastContext.Provider>
    );
};
