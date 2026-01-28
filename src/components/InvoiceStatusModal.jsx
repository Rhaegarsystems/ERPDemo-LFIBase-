import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Clock, AlertCircle, Ban } from 'lucide-react';
import '../styles/Modal.css';

const statusOptions = [
    { value: 'Pending', label: 'Pending', icon: Clock, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
    { value: 'Paid', label: 'Paid', icon: CheckCircle, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
    { value: 'Overdue', label: 'Overdue', icon: AlertCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
    { value: 'Cancelled', label: 'Cancelled', icon: Ban, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)' },
];

const InvoiceStatusModal = ({ isOpen, onClose, invoice, onStatusChange }) => {
    const [selectedStatus, setSelectedStatus] = useState(invoice?.status || 'Pending');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await onStatusChange(invoice.id, selectedStatus);
            onClose();
        } catch (error) {
            console.error('Failed to update status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!invoice) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="modal-overlay" onClick={onClose}>
                    <motion.div
                        className="modal-container"
                        style={{ width: '450px' }}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3>Update Invoice Status</h3>
                            <button className="close-btn" onClick={onClose}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            {/* Invoice Info */}
                            <div style={{
                                background: 'var(--bg-tertiary)',
                                padding: '1rem',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '1.5rem'
                            }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Invoice No.</span>
                                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--primary)' }}>{invoice.id}</p>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Client</span>
                                        <p style={{ margin: 0, color: 'var(--text-primary)' }}>{invoice.client_name}</p>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Date</span>
                                        <p style={{ margin: 0, color: 'var(--text-primary)' }}>{invoice.date}</p>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Amount</span>
                                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--success)' }}>
                                            ₹{invoice.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Status Options */}
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                                Select Status:
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                {statusOptions.map((option) => {
                                    const IconComponent = option.icon;
                                    const isSelected = selectedStatus === option.value;
                                    return (
                                        <div
                                            key={option.value}
                                            onClick={() => setSelectedStatus(option.value)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                padding: '1rem',
                                                borderRadius: 'var(--radius-md)',
                                                border: isSelected ? `2px solid ${option.color}` : '2px solid var(--border)',
                                                background: isSelected ? option.bg : 'var(--bg-secondary)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <IconComponent
                                                size={22}
                                                style={{ color: option.color }}
                                            />
                                            <span style={{
                                                fontWeight: isSelected ? 600 : 400,
                                                color: isSelected ? option.color : 'var(--text-primary)'
                                            }}>
                                                {option.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-ghost" onClick={onClose}>Cancel</button>
                            <button
                                className="btn-primary-glow"
                                onClick={handleSave}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Saving...' : 'Update Status'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default InvoiceStatusModal;
