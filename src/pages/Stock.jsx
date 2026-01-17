import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, RefreshCcw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import GlassTable from '../components/GlassTable';
import '../styles/PageCommon.css';

const Stock = () => {
    const [data, setData] = useState([]);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const logs = await invoke('get_stock_logs');
                const formatted = logs.map(log => ({
                    ...log,
                    item: log.item_name,
                    type: log.type, // Ensure backend sends 'type' or 'type_' mapped correctly
                    quantity: log.type === 'IN' ? `+${log.quantity}` : log.type === 'OUT' ? `-${log.quantity}` : `${log.quantity}`
                }));
                setData(formatted);
            } catch (e) {
                console.error("Failed to fetch stock logs", e);
            }
        };
        fetchLogs();
    }, []);

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
