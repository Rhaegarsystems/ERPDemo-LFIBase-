import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, FileText } from 'lucide-react';
import GlassTable from '../components/GlassTable';
import Modal from '../components/Modal';
import '../styles/PageCommon.css';

const Invoices = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [data, setData] = useState([
        { id: "INV-2023-001", client: "Acme Corp", date: "2023-10-20", due: "2023-11-20", amount: "$1,200.00", status: "Paid" },
        { id: "INV-2023-002", client: "Globex Inc", date: "2023-10-22", due: "2023-11-22", amount: "$850.50", status: "Pending" },
        { id: "INV-2023-003", client: "Soylent Corp", date: "2023-10-25", due: "2023-11-25", amount: "$3,400.00", status: "Overdue" },
    ]);

    const [newInvoice, setNewInvoice] = useState({
        client: '',
        date: '',
        due: '',
        amount: '',
        status: 'Pending'
    });

    const columns = [
        {
            header: "Invoice ID", accessor: "id", render: (id) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace' }}>
                    <FileText size={14} className="text-muted" /> {id}
                </div>
            )
        },
        { header: "Client", accessor: "client" },
        { header: "Date", accessor: "date" },
        { header: "Due Date", accessor: "due" },
        { header: "Amount", accessor: "amount", render: (amt) => <span style={{ fontWeight: 'bold' }}>{amt}</span> },
        {
            header: "Status", accessor: "status", render: (status) => {
                const color = status === 'Paid' ? 'success' : status === 'Overdue' ? 'danger' : 'warning';
                return (
                    <span className={`badge ${status.toLowerCase()}`} style={{
                        background: `rgba(var(--${color}-rgb), 0.1)`,
                        color: `var(--${color})`,
                        border: `1px solid rgba(var(--${color}-rgb), 0.2)`
                    }}>
                        {status}
                    </span>
                );
            }
        },
    ];

    const handleSave = () => {
        // Mock Save
        const newItem = {
            id: `INV-2023-00${data.length + 1}`,
            ...newInvoice,
            amount: `$${parseFloat(newInvoice.amount).toFixed(2)}`
        };
        setData([...data, newItem]);
        setIsModalOpen(false);
        setNewInvoice({ client: '', date: '', due: '', amount: '', status: 'Pending' });
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
                        Invoices
                    </motion.h1>
                    <p className="page-subtitle">Billing and payments.</p>
                </div>
                <button className="btn-primary-glow" onClick={() => setIsModalOpen(true)}>
                    <Plus size={18} /> New Invoice
                </button>
            </header>

            <div className="controls-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input type="text" placeholder="Search invoices..." />
                </div>
            </div>

            <GlassTable columns={columns} data={data} actions={true} />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Create New Invoice"
                actions={
                    <>
                        <button className="btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                        <button className="btn-primary-glow" onClick={handleSave}>Create Invoice</button>
                    </>
                }
            >
                <div className="form-group">
                    <label>Client</label>
                    <input
                        type="text"
                        className="form-input"
                        value={newInvoice.client}
                        onChange={(e) => setNewInvoice({ ...newInvoice, client: e.target.value })}
                        placeholder="e.g. Acme Corp"
                    />
                </div>
                <div className="flex gap-4" style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group w-full" style={{ flex: 1 }}>
                        <label>Issue Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={newInvoice.date}
                            onChange={(e) => setNewInvoice({ ...newInvoice, date: e.target.value })}
                        />
                    </div>
                    <div className="form-group w-full" style={{ flex: 1 }}>
                        <label>Due Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={newInvoice.due}
                            onChange={(e) => setNewInvoice({ ...newInvoice, due: e.target.value })}
                        />
                    </div>
                </div>
                <div className="flex gap-4" style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group w-full" style={{ flex: 1 }}>
                        <label>Amount ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            value={newInvoice.amount}
                            onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                            placeholder="0.00"
                        />
                    </div>
                    <div className="form-group w-full" style={{ flex: 1 }}>
                        <label>Status</label>
                        <select
                            className="form-input"
                            value={newInvoice.status}
                            onChange={(e) => setNewInvoice({ ...newInvoice, status: e.target.value })}
                        >
                            <option value="Paid">Paid</option>
                            <option value="Pending">Pending</option>
                            <option value="Overdue">Overdue</option>
                        </select>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Invoices;
