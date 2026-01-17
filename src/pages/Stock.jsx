import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, RefreshCcw } from 'lucide-react';
import GlassTable from '../components/GlassTable';
import '../styles/PageCommon.css';

const Stock = () => {
    const data = [
        { id: 1, item: "Steel Pipe 20mm", type: "IN", quantity: "+500", date: "2023-10-25", user: "John Doe" },
        { id: 2, item: "Copper Wire 50m", type: "OUT", quantity: "-20", date: "2023-10-24", user: "Jane Smith" },
        { id: 3, item: "Industrial Bolt M10", type: "ADJUST", quantity: "-5", date: "2023-10-24", user: "Admin" },
        { id: 4, item: "Steel Pipe 20mm", type: "IN", quantity: "+200", date: "2023-10-23", user: "John Doe" },
    ];

    const columns = [
        { header: "Date", accessor: "date" },
        { header: "Item", accessor: "item" },
        {
            header: "Transaction Type", accessor: "type", render: (type) => (
                <span style={{
                    color: type === 'IN' ? 'var(--success)' : type === 'OUT' ? 'var(--danger)' : 'var(--warning)',
                    display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600
                }}>
                    {type === 'IN' ? <ArrowUpRight size={14} /> : type === 'OUT' ? <ArrowDownRight size={14} /> : <RefreshCcw size={14} />}
                    {type}
                </span>
            )
        },
        {
            header: "Quantity", accessor: "quantity", render: (qty) => (
                <span style={{ color: qty.startsWith('+') ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                    {qty}
                </span>
            )
        },
        { header: "User", accessor: "user" },
    ];

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="page-title"
                    >
                        Stock Movements
                    </motion.h1>
                    <p className="page-subtitle">Track every stock transaction.</p>
                </div>
            </header>

            <GlassTable columns={columns} data={data} actions={false} />
        </div>
    );
};

export default Stock;
