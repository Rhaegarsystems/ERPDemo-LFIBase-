import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import '../styles/FormSideSheet.css';

const FormSideSheet = ({ isOpen, onClose, title, children, actions }) => {
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            <div className="sheet-overlay" onClick={onClose} />
            <div className="side-sheet">
                <div className="sheet-header">
                    <h3>{title}</h3>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="sheet-body">
                    {children}
                </div>
                <div className="sheet-footer">
                    {actions}
                </div>
            </div>
        </>
    );
};

export default FormSideSheet;