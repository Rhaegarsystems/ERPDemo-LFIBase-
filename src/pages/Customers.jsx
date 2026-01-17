import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Users } from 'lucide-react';
import GlassTable from '../components/GlassTable';
import Modal from '../components/Modal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import AlertModal from '../components/AlertModal';
import '../styles/PageCommon.css';
import { invoke } from '@tauri-apps/api/core';

const Customers = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'success', title: '', message: '' });
    const [data, setData] = useState([]);

    const [newCustomer, setNewCustomer] = useState({
        id: null,
        name: '',
        contact: '',
        email: '',
        phone: '',
        address: '',
        gstin: '',
        state: '',
        state_code: '',
        vendor_code: ''
    });

    const fetchCustomers = async () => {
        try {
            const result = await invoke('get_customers');
            const formatted = result.map(c => ({
                ...c,
                orders: c.orders || 0,
                total: c.total_value ? `₹${c.total_value.toFixed(2)}` : '₹0.00'
            }));
            setData(formatted);
        } catch (error) {
            console.error("Failed to fetch customers:", error);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const columns = [
        { header: "Customer Name", accessor: "name" },
        { header: "Vendor Code", accessor: "vendor_code" },
        { header: "Contact", accessor: "contact" },
        { header: "Email", accessor: "email" },
        { header: "GSTIN", accessor: "gstin" },
        { header: "State", accessor: "state" },
        { header: "Orders", accessor: "orders" },
    ];

    const showAlert = (type, title, message) => {
        setAlertConfig({ isOpen: true, type, title, message });
    };

    const handleSave = async () => {
        try {
            if (newCustomer.id) {
                await invoke('update_customer', { customer: newCustomer });
                showAlert('success', 'Updated', 'Customer details updated.');
            } else {
                await invoke('add_customer', { customer: newCustomer });
                showAlert('success', 'Added', 'New customer added.');
            }
            setIsModalOpen(false);
            fetchCustomers();
            setNewCustomer({
                id: null, name: '', contact: '', email: '', phone: '',
                address: '', gstin: '', state: '', state_code: '', vendor_code: ''
            });
        } catch (error) {
            console.error("Failed to save customer:", error);
            showAlert('error', 'Error', "Error saving customer: " + error);
        }
    };

    const handleDelete = (item) => {
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await invoke('delete_customer', { id: itemToDelete.id });
            fetchCustomers();
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
            showAlert('success', 'Deleted', 'Customer deleted.');
        } catch (e) {
            showAlert('error', 'Error', "Delete failed: " + e);
        }
    };

    const handleEdit = (item) => {
        setNewCustomer({ ...item, vendor_code: item.vendor_code || '' });
        setIsModalOpen(true);
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="page-title"
                    >
                        Customers
                    </motion.h1>
                    <p className="page-subtitle">Manage client relationships.</p>
                </div>
                <button className="btn-primary-glow" onClick={() => {
                    setNewCustomer({ id: null, name: '', contact: '', email: '', phone: '', address: '', gstin: '', state: '', state_code: '', vendor_code: '' });
                    setIsModalOpen(true);
                }}>
                    <Plus size={18} /> Add Customer
                </button>
            </header>

            <div className="controls-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input type="text" placeholder="Search customers..." />
                </div>
            </div>

            {data.length === 0 ? (
                <div className="empty-state">
                    <Users size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <h3>No Customers Found</h3>
                    <p>Add your first customer to get started.</p>
                </div>
            ) : (
                <GlassTable columns={columns} data={data} actions={{ onEdit: handleEdit, onDelete: handleDelete }} />
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={newCustomer.id ? "Edit Customer" : "Add New Customer"}
                actions={
                    <>
                        <button className="btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                        <button className="btn-primary-glow" onClick={handleSave}>Save Customer</button>
                    </>
                }
            >
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 2 }}>
                        <label>Company/Customer Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={newCustomer.name}
                            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                            placeholder="e.g. Acme Corp"
                        />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>Vendor Code</label>
                        <input
                            type="text"
                            className="form-input"
                            value={newCustomer.vendor_code}
                            onChange={(e) => setNewCustomer({ ...newCustomer, vendor_code: e.target.value })}
                            placeholder="e.g. VC-001"
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>Contact Person</label>
                        <input type="text" className="form-input" value={newCustomer.contact}
                            onChange={(e) => setNewCustomer({ ...newCustomer, contact: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>GSTIN</label>
                        <input type="text" className="form-input" value={newCustomer.gstin}
                            onChange={(e) => setNewCustomer({ ...newCustomer, gstin: e.target.value })} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>Email</label>
                        <input type="email" className="form-input" value={newCustomer.email}
                            onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>Phone</label>
                        <input type="tel" className="form-input" value={newCustomer.phone}
                            onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                    </div>
                </div>

                <div className="form-group">
                    <label>Address</label>
                    <textarea
                        className="form-input"
                        rows="2"
                        value={newCustomer.address}
                        onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>State</label>
                        <input type="text" className="form-input" value={newCustomer.state}
                            onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                            placeholder="e.g. Tamil Nadu" />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>State Code</label>
                        <input type="text" className="form-input" value={newCustomer.state_code}
                            onChange={(e) => setNewCustomer({ ...newCustomer, state_code: e.target.value })}
                            placeholder="e.g. 33" />
                    </div>
                </div>
            </Modal>

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                itemName={itemToDelete?.name}
            />

            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
            />
        </div>
    );
};

export default Customers;
