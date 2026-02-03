import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, User, MapPin, Phone } from 'lucide-react';
import '../styles/Modal.css';

const CustomerSelectorModal = ({ isOpen, onClose, customers, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredCustomers, setFilteredCustomers] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setFilteredCustomers(customers || []);
        }
    }, [isOpen, customers]);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredCustomers(customers || []);
        } else {
            const term = searchTerm.toLowerCase();
            const filtered = (customers || []).filter(customer =>
                customer.name?.toLowerCase().includes(term) ||
                customer.vendor_code?.toLowerCase().includes(term) ||
                customer.gstin?.toLowerCase().includes(term) ||
                customer.phone?.toLowerCase().includes(term)
            );
            setFilteredCustomers(filtered);
        }
    }, [searchTerm, customers]);

    const handleSelect = (customer) => {
        onSelect(customer);
        onClose();
    };

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="modal-overlay" onClick={onClose}>
                    <motion.div
                        className="modal-container"
                        style={{ width: '650px', maxWidth: '95vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3>Select Customer</h3>
                            <button className="close-btn" onClick={onClose}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div style={{
                            padding: '1rem 1.5rem',
                            borderBottom: '1px solid var(--border)',
                            background: 'var(--bg-secondary)'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                background: 'var(--bg-tertiary)',
                                padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)'
                            }}>
                                <Search size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                                <input
                                    type="text"
                                    placeholder="Search by Name, Vendor Code, GSTIN, or Phone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                    style={{
                                        flex: 1,
                                        background: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.95rem'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Table Header */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1.5fr 1fr 1fr',
                            padding: '0.75rem 1.5rem',
                            background: 'rgba(139, 92, 246, 0.1)',
                            borderBottom: '1px solid var(--border)',
                            gap: '1rem'
                        }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer Name</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vendor Code</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GSTIN</div>
                        </div>

                        {/* Customers List */}
                        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px' }}>
                            {filteredCustomers.length === 0 ? (
                                <div style={{
                                    padding: '3rem',
                                    textAlign: 'center',
                                    color: 'var(--text-secondary)'
                                }}>
                                    <User size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                    <p style={{ margin: 0 }}>No customers found</p>
                                </div>
                            ) : (
                                filteredCustomers.map((customer) => (
                                    <div
                                        key={customer.id}
                                        onClick={() => handleSelect(customer)}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1.5fr 1fr 1fr',
                                            gap: '1rem',
                                            alignItems: 'center',
                                            padding: '1rem 1.5rem',
                                            borderBottom: '1px solid var(--border)',
                                            cursor: 'pointer',
                                            transition: 'background 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.95rem' }}>{customer.name}</div>
                                        <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{customer.vendor_code || '-'}</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'monospace' }}>{customer.gstin || '-'}</div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '1rem 1.5rem',
                            borderTop: '1px solid var(--border)',
                            background: 'rgba(0, 0, 0, 0.2)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} found
                            </span>
                            <button
                                className="btn-ghost"
                                onClick={onClose}
                                style={{ padding: '0.5rem 1rem' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CustomerSelectorModal;
