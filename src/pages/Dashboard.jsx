import React, { useEffect, useState } from 'react';
import { IndianRupee, Users, ClipboardList, PlusCircle, Edit, Trash2, Save, FileText, User, Box, Activity, Building2, ChevronRight, Clock, Plus, LayoutGrid } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, XAxis } from 'recharts';
import StatCard from '../components/StatCard';
import '../styles/Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const [statsData, setStatsData] = useState({
        revenue: 0,
        customers: 0,
        totalInvoices: 0,
        prevMonthInvoices: 0,
        prevTotalCustomers: 0,
        invoiceHistory: [],
        customerHistory: []
    });
    const [activityLogs, setActivityLogs] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await invoke('get_dashboard_stats');
                setStatsData({
                    revenue: result.revenue,
                    customers: result.customers,
                    totalInvoices: result.total_invoices || 0,
                    prevMonthInvoices: result.prev_month_invoices || 0,
                    prevTotalCustomers: result.prev_total_customers || 0,
                    invoiceHistory: result.invoice_history || [],
                    customerHistory: result.customer_history || []
                });

                const logs = await invoke('get_activity_logs');
                setActivityLogs(logs);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            }
        };
        fetchData();
    }, []);

    const getTrend = (current, prev) => {
        if (current > prev) return { label: 'Increasing', color: 'var(--success)', icon: '↑' };
        if (current < prev) return { label: 'Decreasing', color: 'var(--danger)', icon: '↓' };
        return { label: 'Stable', color: 'var(--text-muted)', icon: '→' };
    };

    const clientTrend = getTrend(statsData.customers, statsData.prevTotalCustomers);
    const invoiceTrend = getTrend(statsData.totalInvoices, statsData.prevMonthInvoices);

    // Helper to format month strings like "2024-03" to "Mar"
    const formatMonth = (str) => {
        if (!str) return "";
        const [year, month] = str.split('-');
        const date = new Date(year, parseInt(month) - 1);
        return date.toLocaleString('default', { month: 'short' });
    };

    // Prepare 6-month chart data
    const clientChartData = statsData.customerHistory.length > 1 
        ? statsData.customerHistory.map(p => ({ ...p, name: formatMonth(p.name) }))
        : [{ name: 'Prev', val: statsData.prevTotalCustomers }, { name: 'Now', val: statsData.customers }];

    const invoiceChartData = statsData.invoiceHistory.length > 1 
        ? statsData.invoiceHistory.map(p => ({ ...p, name: formatMonth(p.name) }))
        : [{ name: 'Prev', val: statsData.prevMonthInvoices }, { name: 'Now', val: statsData.totalInvoices }];

    const getActionColor = (action) => {
        switch (action.toLowerCase()) {
            case 'created': return '#10b981';
            case 'updated': return '#3b82f6';
            case 'deleted': return '#ef4444';
            case 'saved': return '#8b5cf6';
            default: return '#9ca3af';
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

    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const formattedDay = today.toLocaleDateString('en-GB', { weekday: 'long' });

    return (
        <div className="dashboard-container">
            {/* Greeting Header */}
            <header className="dashboard-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 0 }}>
                <div style={{ marginTop: 0 }}>
                    <h1 className="greeting-text" style={{ marginTop: 0 }}>RhaegarSystems ERP</h1>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-muted)', fontSize: '1.1rem' }}>Demo Version - Dashboard Overview</p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="quick-action-icons" style={{ display: 'flex', gap: '0.5rem', marginRight: '1rem', paddingRight: '1rem', borderRight: '1px solid var(--glass-border)' }}>
                        <Link to="/invoices/create" className="icon-action-btn" title="Create Invoice" style={{ 
                            width: '42px', height: '42px', borderRadius: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', transition: 'all 0.2s'
                        }}>
                            <Plus size={20} />
                        </Link>
                        <Link to="/customers" className="icon-action-btn" title="Add Customer" style={{ 
                            width: '42px', height: '42px', borderRadius: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', transition: 'all 0.2s'
                        }}>
                            <User size={20} />
                        </Link>
                        <Link to="/inventory" className="icon-action-btn" title="Parts" style={{ 
                            width: '42px', height: '42px', borderRadius: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', transition: 'all 0.2s'
                        }}>
                            <Box size={20} />
                        </Link>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>{formattedDate}</p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--primary)' }}>{formattedDay}</p>
                    </div>
                </div>
            </header>

            <div className="dashboard-main-grid" style={{ marginTop: '-0.5rem' }}>
                {/* Left Column: Timeline Activity */}
                <section className="timeline-card">
                    <div className="timeline-header">
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                            <Clock size={20} style={{ color: 'var(--primary)' }} /> Recent Changes
                        </h3>
                        <Link to="/settings" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Settings</Link>
                    </div>

                    <div className="timeline-scroll-area">
                        {activityLogs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                <Activity size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                <p>Waiting for your first move...</p>
                            </div>
                        ) : (
                            <div className="timeline-container">
                                {activityLogs.map((log) => {
                                    const actionColor = getActionColor(log.action);
                                    return (
                                        <div key={log.id} className="timeline-item">
                                            <div className="timeline-dot" style={{ borderColor: actionColor }}>
                                                <div style={{ color: actionColor }}>{getEntityIcon(log.entity_type)}</div>
                                            </div>
                                            <div className="timeline-content">
                                                <div className="timeline-meta">
                                                    <span className="timeline-action" style={{ background: actionColor + '20', color: actionColor }}>
                                                        {log.action}
                                                    </span>
                                                    <span className="timeline-time">{log.timestamp}</span>
                                                </div>
                                                <div className="timeline-title">
                                                    {log.entity_name}
                                                </div>
                                                <div className="timeline-desc">
                                                    {log.entity_type} {log.details && `• ${log.details}`}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                {/* Right Column: Stats & Charts */}
                <div className="stats-column">
                    {/* Total Clients Chart */}
                    <div className="chart-card">
                        <div className="chart-title">Total Clients</div>
                        <div className="chart-content-wrapper">
                            <div style={{ width: '100%', height: 100 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={clientChartData}>
                                        <Line type="monotone" dataKey="val" stroke="#3b82f6" strokeWidth={4} dot={true} animationDuration={1000} />
                                        <Tooltip 
                                            contentStyle={{ background: 'rgba(20, 20, 30, 0.8)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                            labelStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="chart-data-footer">
                            <span className="chart-value">{statsData.customers}</span>
                            <div className="chart-label-group">
                                <span className="chart-label">Total Clients</span>
                                <span className="chart-trend" style={{ color: clientTrend.color }}>
                                    {clientTrend.icon} {clientTrend.label}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Monthly Invoices Chart */}
                    <div className="chart-card">
                        <div className="chart-title">Monthly Invoices</div>
                        <div className="chart-content-wrapper">
                            <div style={{ width: '100%', height: 100 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={invoiceChartData}>
                                        <Line type="monotone" dataKey="val" stroke="#f59e0b" strokeWidth={4} dot={true} animationDuration={1000} />
                                        <Tooltip 
                                            contentStyle={{ background: 'rgba(20, 20, 30, 0.8)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                            labelStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="chart-data-footer">
                            <span className="chart-value">{statsData.totalInvoices}</span>
                            <div className="chart-label-group">
                                <span className="chart-label">This Month</span>
                                <span className="chart-trend" style={{ color: invoiceTrend.color }}>
                                    {invoiceTrend.icon} {invoiceTrend.label}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
