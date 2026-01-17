import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter } from 'lucide-react';
import GlassTable from '../components/GlassTable';
import Modal from '../components/Modal';
import '../styles/PageCommon.css';

const Customers = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [data, setData] = useState([
        { id: 101, name: "Acme Corp", contact: "John Doe", email: "john@acme.com", phone: "+1 555-0123", orders: 12, total: "$15,400" },
        { id: 102, name: "Globex Inc", contact: "Jane Smith", email: "jane@globex.com", phone: "+1 555-0456", orders: 5, total: "$3,250" },
        { id: 103, name: "Soylent Corp", contact: "Richard Roe", email: "richard@soylent.com", phone: "+1 555-0789", orders: 28, total: "$45,900" },
    ]);

    // New Customer Form State
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        contact: '',
        email: '',
        phone: ''
    });

    const columns = [
        { header: "Customer Name", accessor: "name" },
        { header: "Contact Person", accessor: "contact" },
        { header: "Email", accessor: "email" },
        { header: "Phone", accessor: "phone" },
        { header: "Orders", accessor: "orders" },
        { header: "Total Value", accessor: "total", render: (val) => <span style={{ fontWeight: 'bold' }}>{val}</span> },
    ];

    const handleSave = () => {
        // Mock Save Logic
        const newItem = {
            id: data.length + 101,
            ...newCustomer,
            orders: 0,
            total: "$0.00"
        };
        setData([...data, newItem]);
        setIsModalOpen(false);
        setNewCustomer({ name: '', contact: '', email: '', phone: '' });
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
                <button className="btn-primary-glow" onClick={() => setIsModalOpen(true)}>
                    <Plus size={18} /> Add Customer
                </button>
            </header>

            <div className="controls-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input type="text" placeholder="Search customers..." />
                </div>
            </div>

            <GlassTable columns={columns} data={data} actions={true} />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Add New Customer"
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
                    <label>Contact Person</label>
                    <input
                        type="text"
                        className="form-input"
                        value={newCustomer.contact}
                        onChange={(e) => setNewCustomer({ ...newCustomer, contact: e.target.value })}
                        placeholder="e.g. John Doe"
                    />
                </div>
                <div className="flex gap-4" style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group w-full" style={{ flex: 1 }}>
                        <label>Email</label>
                        <input
                            type="email"
                            className="form-input"
                            value={newCustomer.email}
                            onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                            placeholder="name@company.com"
                        />
                    </div>
                    <div className="form-group w-full" style={{ flex: 1 }}>
                        <label>Phone</label>
                        <input
                            type="tel"
                            className="form-input"
                            value={newCustomer.phone}
                            onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                            placeholder="+1 234 567 8900"
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Customers;
