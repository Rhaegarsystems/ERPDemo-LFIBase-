import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, Package, Users, Activity, ClipboardList, PlusCircle, Edit, Trash2, Save, FileText, User, Box } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import StatCard from '../components/StatCard';
import '../styles/Dashboard.css';

const Dashboard = () => {
    const [statsData, setStatsData] = useState({
        revenue: 0,
        activeOrders: 0,
        customers: 0,
        totalInvoices: 0
    });
    const [activityLogs, setActivityLogs] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await invoke('get_dashboard_stats');
                setStatsData({
                    revenue: result.revenue,
                    activeOrders: result.active_orders,
                    customers: result.customers,
                    totalInvoices: result.total_invoices || 0
                });

                const logs = await invoke('get_activity_logs');
                setActivityLogs(logs);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            }
        };
        fetchData();
    }, []);

    const getActionIcon = (action) => {
        switch (action.toLowerCase()) {
            case 'created': return <PlusCircle size={16} />;
            case 'updated': return <Edit size={16} />;
            case 'deleted': return <Trash2 size={16} />;
            case 'saved': return <Save size={16} />;
            default: return <Activity size={16} />;
        }
    };

    const getActionColor = (action) => {
        switch (action.toLowerCase()) {
            case 'created': return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
            case 'updated': return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' };
            case 'deleted': return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
            case 'saved': return { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)' };
            default: return { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280', border: 'rgba(107, 114, 128, 0.3)' };
        }
    };

    const getEntityIcon = (entityType) => {
        switch (entityType.toLowerCase()) {
            case 'invoice': return <FileText size={18} />;
            case 'customer': return <User size={18} />;
            case 'product': return <Box size={18} />;
            default: return <Activity size={18} />;
        }
    };

    const stats = [
        {
            title: "Total Revenue",
            value: `₹${statsData.revenue.toLocaleString('en-IN')}`,
            change: "+20.1%",
            trend: "up",
            icon: <IndianRupee size={24} color="#10b981" />
        },
        {
            title: "Active Orders",
            value: statsData.activeOrders.toString(),
            change: `${statsData.activeOrders}`,
            trend: "up",
            icon: <Package size={24} color="#8b5cf6" />
        },
        {
            title: "Total Customers",
            value: statsData.customers.toString(),
            change: `${statsData.customers}`,
            trend: "up",
            icon: <Users size={24} color="#3b82f6" />
        },
        {
            title: "Total Invoices",
            value: statsData.totalInvoices.toString(),
            change: `${statsData.totalInvoices} invoices`,
            trend: "up",
            icon: <FileText size={24} color="#f59e0b" />
        }
    ];

    return (
        <div className="dashboard-container">
            <header className="page-header">
                <div>
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="page-title"
                    >
                        Dashboard
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="page-subtitle"
                    >
                        Overview of your business performance.
                    </motion.p>
                </div>
            </header>

            <div className="stats-grid">
                {stats.map((stat, index) => (
                    <StatCard key={index} {...stat} delay={index} />
                ))}
            </div>

            <motion.div
                className="dashboard-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={{ marginTop: '1.5rem' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <ClipboardList size={20} /> Recent Activity
                    </h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {activityLogs.length} total entries
                    </span>
                </div>

                {activityLogs.length === 0 ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4rem',
                        color: 'var(--text-secondary)'
                    }}>
                        <ClipboardList size={64} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <p style={{ margin: 0 }}>No activity logged yet</p>
                    </div>
                ) : (
                    <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {activityLogs.slice(0, 25).map((log, index) => {
                                const actionStyle = getActionColor(log.action);
                                return (
                                    <div
                                        key={log.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            padding: '1rem',
                                            background: 'var(--bg-tertiary)',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border)',
                                            transition: 'all 0.15s ease'
                                        }}
                                        className="activity-item"
                                    >
                                        {/* Action Icon */}
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '10px',
                                            background: actionStyle.bg,
                                            border: `1px solid ${actionStyle.border}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: actionStyle.color,
                                            flexShrink: 0
                                        }}>
                                            {getActionIcon(log.action)}
                                        </div>

                                        {/* Content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                <span style={{
                                                    fontWeight: 600,
                                                    color: actionStyle.color,
                                                    fontSize: '0.85rem',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.03em'
                                                }}>
                                                    {log.action}
                                                </span>
                                                <span style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem',
                                                    color: 'var(--text-secondary)',
                                                    fontSize: '0.85rem'
                                                }}>
                                                    {getEntityIcon(log.entity_type)}
                                                    {log.entity_type}
                                                </span>
                                            </div>
                                            <div style={{
                                                fontSize: '0.95rem',
                                                color: 'var(--text-primary)',
                                                fontWeight: 500,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                                {log.entity_name}
                                            </div>
                                            {log.details && (
                                                <div style={{
                                                    fontSize: '0.8rem',
                                                    color: 'var(--text-secondary)',
                                                    marginTop: '0.25rem'
                                                }}>
                                                    {log.details}
                                                </div>
                                            )}
                                        </div>

                                        {/* Timestamp */}
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--text-muted)',
                                            whiteSpace: 'nowrap',
                                            textAlign: 'right',
                                            flexShrink: 0
                                        }}>
                                            {log.timestamp}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default Dashboard;
