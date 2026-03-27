import React, { useEffect, useState } from 'react';
import { IndianRupee, Users, ClipboardList, PlusCircle, Edit, Trash2, Save, FileText, User, Box, Activity, Building2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import StatCard from '../components/StatCard';
import '../styles/Dashboard.css';

const Dashboard = () => {
    const [statsData, setStatsData] = useState({
        revenue: 0,
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
            case 'created': return { bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)', color: '#10b981', border: 'rgba(16, 185, 129, 0.4)' };
            case 'updated': return { bg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.4)' };
            case 'deleted': return { bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.4)' };
            case 'saved': return { bg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.4)' };
            default: return { bg: 'linear-gradient(135deg, rgba(107, 114, 128, 0.2) 0%, rgba(107, 114, 128, 0.1) 100%)', color: '#9ca3af', border: 'rgba(107, 114, 128, 0.4)' };
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

    // Date formatting
    const today = new Date();
    const dateOptions = { day: '2-digit', month: 'long', year: 'numeric' };
    const dayOptions = { weekday: 'long' };
    const formattedDate = today.toLocaleDateString('en-GB', dateOptions);
    const formattedDay = today.toLocaleDateString('en-GB', dayOptions);

    // Stats cards
    const stats = [
        {
            title: "Little Flower Industries",
            value: (
                <div style={{ fontSize: '0.85rem', fontWeight: 'normal', lineHeight: '1.4', marginTop: '4px' }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: '4px' }}>
                        No 45/A, Thiruvalluvar Street, TMP Nagar, Padi, Chennai- 600 050
                    </div>
                    <div style={{ color: 'var(--primary)' }}>
                        {formattedDate} | {formattedDay}
                    </div>
                </div>
            ),
            icon: <Building2 size={24} color="#8b5cf6" />
        },
        {
            title: "Total Customers",
            value: statsData.customers.toString(),
            icon: <Users size={24} color="#3b82f6" />
        },
        {
            title: "Current Month Invoices",
            value: statsData.totalInvoices.toString(),
            icon: <FileText size={24} color="#f59e0b" />
        }
    ];

    return (
        <div className="dashboard-container">
            <header className="page-header">
                <div>
                    <h1 className="page-title">
                        Dashboard
                    </h1>
                    <p className="page-subtitle">
                        Overview of your business performance.
                    </p>
                </div>
            </header>

            <div className="stats-grid">
                {stats.map((stat, index) => (
                    <StatCard key={index} {...stat} />
                ))}
            </div>

            <div
                className="dashboard-card"
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
                            {activityLogs.slice(0, 25).map((log) => {
                                const actionStyle = getActionColor(log.action);
                                return (
                                    <div
                                        key={log.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            padding: '1rem',
                                            background: 'linear-gradient(135deg, rgba(30, 30, 45, 0.8) 0%, rgba(40, 40, 60, 0.8) 100%)',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid rgba(99, 102, 241, 0.2)',
                                        }}
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
            </div>
        </div>
    );
};

export default Dashboard;
