import React, { useState, useEffect } from 'react';
import { X, Search, Package } from 'lucide-react';
import '../styles/Modal.css';

const PartSelectorModal = ({ isOpen, onClose, inventory, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredParts, setFilteredParts] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setFilteredParts(inventory || []);
        }
    }, [isOpen, inventory]);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredParts(inventory || []);
        } else {
            const term = searchTerm.toLowerCase();
            const filtered = (inventory || []).filter(part =>
                String(part.part_number).toLowerCase().includes(term) ||
                part.name?.toLowerCase().includes(term) ||
                part.process?.toLowerCase().includes(term)
            );
            setFilteredParts(filtered);
        }
    }, [searchTerm, inventory]);

    const handleSelect = (part) => {
        onSelect(part);
        onClose();
    };

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    return (
        <>
            {isOpen && (
                <div className="modal-overlay" onClick={onClose}>
                    <div
                        className="modal-container"
                        style={{ width: '700px', maxWidth: '95vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3>Select Part</h3>
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
                                    placeholder="Search by Part Number, Name, or Process..."
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
                            gridTemplateColumns: '1fr 1.5fr 1fr 100px',
                            padding: '0.75rem 1.5rem',
                            background: 'rgba(139, 92, 246, 0.1)',
                            borderBottom: '1px solid var(--border)',
                            gap: '1rem'
                        }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Part Number</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Process</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Rate</div>
                        </div>

                        {/* Parts List */}
                        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px' }}>
                            {filteredParts.length === 0 ? (
                                <div style={{
                                    padding: '3rem',
                                    textAlign: 'center',
                                    color: 'var(--text-secondary)'
                                }}>
                                    <Package size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                    <p style={{ margin: 0 }}>No parts found</p>
                                </div>
                            ) : (
                                filteredParts.map((part) => (
                                    <div
                                        key={part.id}
                                        onClick={() => handleSelect(part)}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1.5fr 1fr 100px',
                                            padding: '1rem 1.5rem',
                                            borderBottom: '1px solid var(--border)',
                                            cursor: 'pointer',
                                            gap: '1rem',
                                            alignItems: 'center'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>{part.part_number}</div>
                                        <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{part.name}</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{part.process || '-'}</div>
                                        <div style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem', textAlign: 'right' }}>₹{part.price?.toFixed(2)}</div>
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
                                {filteredParts.length} part{filteredParts.length !== 1 ? 's' : ''} found
                            </span>
                            <button
                                className="btn-ghost"
                                onClick={onClose}
                                style={{ padding: '0.5rem 1rem' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PartSelectorModal;
