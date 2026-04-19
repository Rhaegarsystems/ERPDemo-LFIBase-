import React, { useState, useEffect } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import GlassTable from '../components/GlassTable';
import FormSideSheet from '../components/FormSideSheet';
import DetailViewModal from '../components/DetailViewModal';
import { useToast } from '../components/ToastProvider';
import { useConfirmToast } from '../components/ConfirmToastProvider';
import '../styles/PageCommon.css';
import { invoke } from '@tauri-apps/api/core';

const Customers = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const toast = useToast();
    const confirmToast = useConfirmToast();

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

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredData(data);
        } else {
            const term = searchTerm.toLowerCase();
            setFilteredData(data.filter(item => 
                (item.name && item.name.toLowerCase().includes(term)) ||
                (item.vendor_code && item.vendor_code.toLowerCase().includes(term)) ||
                (item.gstin && item.gstin.toLowerCase().includes(term)) ||
                (item.state && item.state.toLowerCase().includes(term)) ||
                (item.phone && item.phone.toLowerCase().includes(term)) ||
                (item.email && item.email.toLowerCase().includes(term))
            ));
        }
    }, [searchTerm, data]);

    const columns = [
        { header: "Customer Name", accessor: "name" },
        { header: "Vendor Code", accessor: "vendor_code" },
        { header: "GSTIN", accessor: "gstin" },
        { header: "State", accessor: "state" },
    ];

    const handleSave = async () => {
        try {
            if (newCustomer.id) {
                await invoke('update_customer', { customer: newCustomer });
                toast.success('Updated', 'Customer details updated.');
            } else {
                await invoke('add_customer', { customer: newCustomer });
                toast.success('Added', 'New customer added.');
            }
            setIsModalOpen(false);
            fetchCustomers();
            setNewCustomer({
                id: null, name: '', contact: '', email: '', phone: '',
                address: '', gstin: '', state: '', state_code: '', vendor_code: '', pincode: ''
            });
        } catch (error) {
            console.error("Failed to save customer:", error);
            toast.error('Error', "Error saving customer: " + error);
        }
    };

    const handleDelete = async (item) => {
        const confirmed = await confirmToast.showConfirm({
            title: 'Delete Customer',
            message: `Are you sure you want to delete "${item.name}"?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'danger'
        });
        
        if (confirmed) {
            try {
                await invoke('delete_customer', { id: item.id });
                fetchCustomers();
                toast.success('Deleted', 'Customer deleted.');
            } catch (e) {
                toast.error('Error', "Delete failed: " + e);
            }
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
            <header className="dashboard-header" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 0 }}>
                <div style={{ marginTop: 0 }}>
                    <h1 className="greeting-text" style={{ marginTop: 0 }}>Customers</h1>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-muted)', fontSize: '1.1rem' }}>Manage client relationships</p>
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
                    <input 
                        type="text" 
                        placeholder="Search customers..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {filteredData.length === 0 ? (
                <div className="empty-state">
                    <Users size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <h3>{searchTerm ? 'No Customers Found' : 'No Customers Found'}</h3>
                    <p>{searchTerm ? 'No customers match your search.' : 'Add your first customer to get started.'}</p>
                </div>
            ) : (
                <GlassTable
                    columns={columns}
                    data={filteredData}
                    actions={{ onEdit: handleEdit, onDelete: handleDelete }}
                    onRowClick={handleRowClick}
                />
            )}

            <FormSideSheet
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
                <div className="form-group">
                    <label>Company/Customer Name</label>
                    <input
                        type="text"
                        className="form-input"
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                        placeholder="e.g. Acme Corp"
                    />
                </div>
                <div className="form-group">
                    <label>Vendor Code</label>
                    <input
                        type="text"
                        className="form-input"
                        value={newCustomer.vendor_code}
                        onChange={(e) => setNewCustomer({ ...newCustomer, vendor_code: e.target.value })}
                        placeholder="VC-001"
                    />
                </div>
                <div className="form-group">
                    <label>Contact Person</label>
                    <input type="text" className="form-input" value={newCustomer.contact}
                        onChange={(e) => setNewCustomer({ ...newCustomer, contact: e.target.value })} />
                </div>
                <div className="form-group">
                    <label>GSTIN</label>
                    <input type="text" className="form-input" value={newCustomer.gstin}
                        onChange={(e) => setNewCustomer({ ...newCustomer, gstin: e.target.value })} />
                </div>
                <div className="form-group">
                    <label>Email</label>
                    <input type="email" className="form-input" value={newCustomer.email}
                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                </div>
                <div className="form-group">
                    <label>Phone</label>
                    <input type="tel" className="form-input" value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
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
                <div className="form-group">
                    <label>Pincode</label>
                    <input type="text" className="form-input" value={newCustomer.pincode}
                        onChange={(e) => setNewCustomer({ ...newCustomer, pincode: e.target.value })}
                        placeholder="600050" />
                </div>
                <div className="form-group">
                    <label>State</label>
                    <input type="text" className="form-input" value={newCustomer.state}
                        onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                        placeholder="Tamil Nadu" />
                </div>
                <div className="form-group">
                    <label>State Code</label>
                    <input type="text" className="form-input" value={newCustomer.state_code}
                        onChange={(e) => setNewCustomer({ ...newCustomer, state_code: e.target.value })}
                        placeholder="33" />
                </div>
            </FormSideSheet>

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
