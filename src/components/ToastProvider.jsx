import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import '../styles/Toast.css';

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((toast) => {
        const id = Date.now();
        const newToast = {
            id,
            type: 'success',
            duration: 5000, // Slightly longer for actions
            ...toast,
        };
        setToasts((prev) => [...prev, newToast]);
        
        if (newToast.type !== 'error' && !newToast.action) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, newToast.duration);
        }
        
        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = {
        success: (title, message, options = {}) => addToast({ type: 'success', title, message, ...options }),
        error: (title, message, options = {}) => addToast({ type: 'error', title, message, duration: 8000, ...options }),
        warning: (title, message, options = {}) => addToast({ type: 'warning', title, message, ...options }),
        info: (title, message, options = {}) => addToast({ type: 'info', title, message, ...options }),
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle size={20} />;
            case 'error': return <XCircle size={20} />;
            case 'warning': return <AlertCircle size={20} />;
            case 'info': return <Info size={20} />;
            default: return <AlertCircle size={20} />;
        }
    };

    const getColors = (type) => {
        switch (type) {
            case 'success': return { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', text: '#10b981' };
            case 'error': return { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#ef4444' };
            case 'warning': return { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#f59e0b' };
            case 'info': return { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', text: '#3b82f6' };
            default: return { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', text: '#3b82f6' };
        }
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="toast-container">
                <AnimatePresence>
                    {toasts.map((t) => {
                        const colors = getColors(t.type);
                        return (
                            <motion.div
                                key={t.id}
                                className="toast"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                style={{ 
                                    borderLeftColor: colors.border,
                                    background: `linear-gradient(135deg, rgba(20, 20, 30, 0.98) 0%, ${colors.bg} 100%)`,
                                }}
                            >
                                <span style={{ color: colors.text, display: 'flex' }}>{getIcon(t.type)}</span>
                                <div className="toast-content">
                                    <p className="toast-title">{t.title}</p>
                                    {t.message && <p className="toast-message">{t.message}</p>}
                                    {t.action && (
                                        <button 
                                            className="toast-action-btn"
                                            onClick={() => {
                                                t.action.onClick();
                                                if (t.action.closeOnClick !== false) removeToast(t.id);
                                            }}
                                        >
                                            {t.action.label}
                                        </button>
                                    )}
                                </div>
                                <button className="toast-close" onClick={() => removeToast(t.id)}>×</button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};
