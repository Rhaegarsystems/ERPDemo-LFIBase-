import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import '../styles/Modal.css';

const AlertModal = ({ isOpen, onClose, type = 'success', title, message }) => {

    // Auto close success messages after 2 seconds
    useEffect(() => {
        if (isOpen && type === 'success') {
            const timer = setTimeout(() => {
                onClose();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, type, onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle size={48} color="#10b981" />;
            case 'error': return <XCircle size={48} color="#ef4444" />;
            case 'warning': return <AlertCircle size={48} color="#f59e0b" />;
            default: return <AlertCircle size={48} color="#3b82f6" />;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
                    <motion.div
                        className="modal-container"
                        initial={{ opacity: 0, scale: 0.9, y: 0 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '400px', textAlign: 'center', padding: '30px' }}
                    >
                        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                            {getIcon()}
                        </div>
                        <h3 style={{ marginBottom: '10px', fontSize: '1.25rem' }}>{title}</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{message}</p>

                        {(type === 'error' || type === 'warning') && (
                            <button className="btn-primary-glow" onClick={onClose} style={{ width: '100%' }}>
                                Okay
                            </button>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AlertModal;
