import React, { useState, useEffect } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import GlassTable from '../components/GlassTable';
import Modal from '../components/Modal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import AlertModal from '../components/AlertModal';
import DetailViewModal from '../components/DetailViewModal';
import '../styles/PageCommon.css';
import { invoke } from '@tauri-apps/api/core';

const Customers = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'success', title: '', message: '' });
    const [data, setData] = useState([]);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

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
        vendor_code: '',
        pincode: ''
    });

    const fetchCustomers = async () => {
        try {
            const result = await invoke('get_customers');
            setData(result);
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
        { header: "GSTIN", accessor: "gstin" },
        { header: "State", accessor: "state" },
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
                address: '', gstin: '', state: '', state_code: '', vendor_code: '', pincode: ''
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

    const handleRowClick = (item) => {
        setSelectedCustomer(item);
        setIsDetailModalOpen(true);
    };

    const detailFields = [
        { key: 'name', label: 'Customer Name' },
        { key: 'vendor_code', label: 'Vendor Code' },
        { key: 'contact', label: 'Contact Person' },
        { key: 'email', label: 'Email Address' },
        { key: 'phone', label: 'Phone Number' },
        { key: 'gstin', label: 'GSTIN' },
        { key: 'address', label: 'Address' },
        { key: 'pincode', label: 'Pincode' },
        { key: 'state', label: 'State' },
        { key: 'state_code', label: 'State Code' },
    ];

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h1 className="page-title">
                        Customers
                    </h1>
                    <p className="page-subtitle">Manage client relationships.</p>
                </div>
                <button className="btn-primary-glow" onClick={() => {
                    setNewCustomer({ id: null, name: '', contact: '', email: '', phone: '', address: '', gstin: '', state: '', state_code: '', vendor_code: '', pincode: '' });
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
                <GlassTable
                    columns={columns}
                    data={data}
                    actions={{ onEdit: handleEdit, onDelete: handleDelete }}
                    onRowClick={handleRowClick}
                />
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
                    <div className="form-group" style={{ flex: 3 }}>
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
                            placeholder="VC-001"
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>Contact Person</label>
                        <input type="text" className="form-input" value={newCustomer.contact}
                            onChange={(e) => setNewCustomer({ ...newCustomer, contact: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ flex: 2 }}>
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
                        <label>Pincode</label>
                        <input type="text" className="form-input" value={newCustomer.pincode}
                            onChange={(e) => setNewCustomer({ ...newCustomer, pincode: e.target.value })}
                            placeholder="600050" />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>State</label>
                        <input type="text" className="form-input" value={newCustomer.state}
                            onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                            placeholder="Tamil Nadu" />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>State Code</label>
                        <input type="text" className="form-input" value={newCustomer.state_code}
                            onChange={(e) => setNewCustomer({ ...newCustomer, state_code: e.target.value })}
                            placeholder="33" />
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

            <DetailViewModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title="Customer Details"
                data={selectedCustomer}
                fields={detailFields}
            />
        </div>
    );
};

export default Customers;
