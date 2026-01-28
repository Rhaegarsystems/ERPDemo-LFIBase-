import React from 'react';
import Modal from './Modal';
import '../styles/DetailViewModal.css';

const DetailViewModal = ({ isOpen, onClose, title, data, fields }) => {
    if (!data) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            actions={
                <button className="btn-ghost" onClick={onClose}>Close</button>
            }
        >
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
        </Modal>
    );
};

export default DetailViewModal;
