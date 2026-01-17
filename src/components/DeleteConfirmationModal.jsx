import React from 'react';
import Modal from './Modal';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemName, title = "Confirm Delete" }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            actions={
                <>
                    <button className="btn-ghost" onClick={onClose}>Cancel</button>
                    <button
                        className="btn-primary-glow"
                        onClick={onConfirm}
                        style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            borderColor: 'rgba(239, 68, 68, 0.4)'
                        }}
                    >
                        Delete
                    </button>
                </>
            }
        >
            <div className="p-4" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '10px' }}>
                    Are you sure you want to delete <strong style={{ color: '#ef4444' }}>{itemName}</strong>?
                </p>
                <p style={{ fontSize: '0.9rem', color: '#888' }}>
                    This action cannot be undone.
                </p>
            </div>
        </Modal>
    );
};

export default DeleteConfirmationModal;
