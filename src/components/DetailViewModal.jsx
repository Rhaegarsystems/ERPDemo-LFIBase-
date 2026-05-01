import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import '../styles/DetailViewModal.css';

const DetailViewModal = ({ isOpen, onClose, title, data, fields }) => {
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            document.body.classList.add('modal-open');
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.classList.remove('modal-open');
        };
    }, [isOpen, onClose]);

    if (!isOpen || !data) return null;

    return (
        <>
            <div className="detail-sheet-overlay" onClick={onClose} />
            <div className="detail-side-sheet">
                <div className="sheet-header">
                    <h3>{title}</h3>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="sheet-body">
                    <div className="detail-grid">
                        {fields.map((field, index) => (
                            <div key={field.key} className="detail-item">
                                <span className="detail-label">{field.label}</span>
                                <span className="detail-value">
                                    {field.render
                                        ? field.render(data[field.key], data)
                                        : (data[field.key] || '—')}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="sheet-footer">
                    <button className="btn-ghost" onClick={onClose}>Close</button>
                </div>
            </div>
        </>
    );
};

export default DetailViewModal;