import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, Package, Users, Activity, TrendingUp, ClipboardList } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import StatCard from '../components/StatCard';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import '../styles/Dashboard.css';

const Dashboard = () => {
    const [statsData, setStatsData] = useState({
        revenue: 0,
        activeOrders: 0,
        customers: 0,
        lowStock: 0
    });
    const [revenueHistory, setRevenueHistory] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await invoke('get_dashboard_stats');
                setStatsData({
                    revenue: result.revenue,
                    activeOrders: result.active_orders,
                    customers: result.customers,
                    lowStock: result.low_stock
                });

                const history = await invoke('get_revenue_history');
                setRevenueHistory(history);

                const logs = await invoke('get_activity_logs');
                setActivityLogs(logs);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            }
        };
        fetchData();
    }, []);

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
            title: "Low Stock Items",
            value: statsData.lowStock.toString(),
            change: `${statsData.lowStock} items`,
            trend: statsData.lowStock > 5 ? "down" : "up",
            icon: <Activity size={24} color="#ef4444" />
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
                <div className="header-actions">
                    <button className="btn-glass">
                        <TrendingUp size={16} /> Generate Report
                    </button>
                </div>
            </header>

            <div className="stats-grid">
                {stats.map((stat, index) => (
                    <StatCard key={index} {...stat} delay={index} />
                ))}
            </div>

            <div className="dashboard-grid-2">
                <motion.div
                    className="dashboard-card chart-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <h3>Revenue Overview (Last 30 Days)</h3>
                    <div className="chart-container" style={{ width: '100%', height: 300 }}>
                        {revenueHistory.length === 0 ? (
                            <div className="empty-state-small">
                                <TrendingUp size={48} style={{ opacity: 0.2 }} />
                                <p>No revenue data yet</p>
                            </div>
                        ) : (
                            <ResponsiveContainer>
                                <AreaChart data={revenueHistory}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                                        contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </motion.div>

                <motion.div
                    className="dashboard-card recent-activity"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ClipboardList size={18} /> Recent Activity
                    </h3>
                    {activityLogs.length === 0 ? (
                        <div className="empty-state-small">
                            <ClipboardList size={48} style={{ opacity: 0.2 }} />
                            <p>No activity logged yet</p>
                        </div>
                    ) : (
                        <div className="activity-table-wrapper">
                            <table className="activity-table">
                                <thead>
                                    <tr>
                                        <th>Action</th>
                                        <th>Type</th>
                                        <th>Name</th>
                                        <th>Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activityLogs.slice(0, 10).map((log) => (
                                        <tr key={log.id}>
                                            <td>
                                                <span className={`badge ${log.action.toLowerCase()}`}>{log.action}</span>
                                            </td>
                                            <td>{log.entity_type}</td>
                                            <td>{log.entity_name}</td>
                                            <td style={{ fontSize: '0.75rem', opacity: 0.7 }}>{log.timestamp}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            </div>

            <style>{`
                .empty-state-small {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 200px;
                    color: var(--text-secondary);
                }
                .activity-table-wrapper {
                    max-height: 280px;
                    overflow-y: auto;
                }
                .activity-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.85rem;
                }
                .activity-table th {
                    text-align: left;
                    padding: 0.5rem;
                    border-bottom: 1px solid var(--border-color);
                    font-weight: 600;
                    color: var(--text-secondary);
                }
                .activity-table td {
                    padding: 0.5rem;
                    border-bottom: 1px solid var(--border-color);
                }
                .badge {
                    padding: 0.2rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .badge.created { background: #10b98120; color: #10b981; }
                .badge.updated { background: #3b82f620; color: #3b82f6; }
                .badge.deleted { background: #ef444420; color: #ef4444; }
                .badge.saved { background: #8b5cf620; color: #8b5cf6; }
            `}</style>
        </div>
    );
};

export default Dashboard;
