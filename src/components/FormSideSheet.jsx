import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import '../styles/FormSideSheet.css';

const FormSideSheet = ({ isOpen, onClose, title, children, actions }) => {
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

    if (!isOpen) return null;

    return (
        <>
            <div className="form-sheet-overlay" onClick={onClose} />
            <div className="form-side-sheet">
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