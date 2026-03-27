import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import GlassTable from '../components/GlassTable';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import AlertModal from '../components/AlertModal';
import InvoiceStatusModal from '../components/InvoiceStatusModal';
import '../styles/PageCommon.css';

const Invoices = () => {
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'success', title: '', message: '' });
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    const fetchInvoices = async () => {
        try {
            const result = await invoke('get_invoices');
            setData(result);
        } catch (error) {
            console.error("Failed to fetch invoices:", error);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const columns = [
        { header: "Invoice No", accessor: "id" },
        { header: "Client", accessor: "client_name" },
        { header: "Vendor Code", accessor: "vendor_code" },
        { header: "Date", accessor: "date" },
        { header: "Amount", accessor: "amount", render: (val) => `₹${val ? val.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}` },
        {
            header: "Status", accessor: "status", render: (status) => (
                <span className={`badge ${status ? status.toLowerCase() : 'pending'}`}>
                    {status || 'Pending'}
                </span>
            )
        },
    ];

    const showAlert = (type, title, message) => {
        setAlertConfig({ isOpen: true, type, title, message });
    };

    const handleDelete = (item) => {
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await invoke('delete_invoice', { id: itemToDelete.id });
            fetchInvoices();
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
            showAlert('success', 'Deleted', 'Invoice deleted.');
        } catch (e) {
            showAlert('error', 'Error', "Delete failed: " + e);
        }
    };

    const handleEdit = (item) => {
        navigate(`/invoices/edit/${item.id}`);
    };

    const handlePrint = (item) => {
        navigate(`/invoices/edit/${item.id}?print=true`);
    };

    const handleRowClick = (item) => {
        setSelectedInvoice(item);
        setIsStatusModalOpen(true);
    };

    const handleStatusChange = async (invoiceId, newStatus) => {
        try {
            await invoke('update_invoice_status', { id: invoiceId, status: newStatus });
            fetchInvoices();
            showAlert('success', 'Updated', `Invoice status changed to ${newStatus}.`);
        } catch (e) {
            showAlert('error', 'Error', "Status update failed: " + e);
            throw e;
        }
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h1 className="page-title">
                        Invoices
                    </h1>
                    <p className="page-subtitle">Billing and payments.</p>
                </div>
                <button className="btn-primary-glow" onClick={() => navigate('/invoices/create')}>
                    <Plus size={18} /> New Invoice
                </button>
            </header>

            <div className="controls-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input type="text" placeholder="Search invoices..." />
                </div>
            </div>

            {data.length === 0 ? (
                <div className="empty-state">
                    <FileText size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <h3>No Invoices Found</h3>
                    <p>Create your first invoice to get started.</p>
                </div>
            ) : (
                <GlassTable
                    columns={columns}
                    data={data}
                    actions={{ onEdit: handleEdit, onDelete: handleDelete, onPrint: handlePrint }}
                    onRowClick={handleRowClick}
                />
            )}

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                itemName={itemToDelete?.id}
                title="Delete Invoice"
            />

            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
            />

            <InvoiceStatusModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                invoice={selectedInvoice}
                onStatusChange={handleStatusChange}
            />
        </div>
    );
};

export default Invoices;
