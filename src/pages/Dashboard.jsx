import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Package, Users, Activity, TrendingUp } from 'lucide-react';
import StatCard from '../components/StatCard';
import '../styles/Dashboard.css';

const Dashboard = () => {
    const stats = [
        {
            title: "Total Revenue",
            value: "$45,231.89",
            change: "+20.1%",
            trend: "up",
            icon: <DollarSign size={24} color="#10b981" />
        },
        {
            title: "Active Orders",
            value: "356",
            change: "+180",
            trend: "up",
            icon: <Package size={24} color="#8b5cf6" />
        },
        {
            title: "New Customers",
            value: "2,405",
            change: "+19%",
            trend: "up",
            icon: <Users size={24} color="#3b82f6" />
        },
        {
            title: "Low Stock Items",
            value: "12",
            change: "-4%",
            trend: "down",
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
                    <h3>Revenue Overview</h3>
                    <div className="chart-placeholder">
                        {/* Chart placeholder using CSS/Gradients */}
                        <div className="mock-chart-bar" style={{ height: '40%' }}></div>
                        <div className="mock-chart-bar" style={{ height: '70%' }}></div>
                        <div className="mock-chart-bar" style={{ height: '50%' }}></div>
                        <div className="mock-chart-bar" style={{ height: '90%' }}></div>
                        <div className="mock-chart-bar" style={{ height: '60%' }}></div>
                        <div className="mock-chart-bar" style={{ height: '80%' }}></div>
                        <div className="mock-chart-bar" style={{ height: '45%' }}></div>
                    </div>
                </motion.div>

                <motion.div
                    className="dashboard-card recent-activity"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <h3>Recent Activity</h3>
                    <ul className="activity-list">
                        {[1, 2, 3, 4].map((i) => (
                            <li key={i} className="activity-item">
                                <div className="activity-dot"></div>
                                <div>
                                    <p className="activity-text">New order #10{i}34 created</p>
                                    <span className="activity-time">2 mins ago</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </motion.div>
            </div>
        </div>
    );
};

export default Dashboard;
