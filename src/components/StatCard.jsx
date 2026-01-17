import React from 'react';
import { motion } from 'framer-motion';
import '../styles/StatCard.css';

const StatCard = ({ title, value, change, icon, trend, delay }) => {
    return (
        <motion.div
            className="stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay * 0.1 }}
        >
            <div className="stat-header">
                <div className="stat-icon-wrapper">
                    {icon}
                </div>
                <span className={`stat-trend ${trend}`}>
                    {change}
                </span>
            </div>
            <div className="stat-content">
                <h3 className="stat-title">{title}</h3>
                <p className="stat-value">{value}</p>
            </div>
        </motion.div>
    );
};

export default StatCard;
