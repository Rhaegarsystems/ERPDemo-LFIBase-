import React from 'react';
import { motion } from 'framer-motion';
import '../styles/StatCard.css';

// Simplified StatCard - no dummy change/trend values
const StatCard = ({ title, value, icon, delay = 0 }) => {
    return (
        <motion.div
            className="stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: delay * 0.1 }}
        >
            <div className="stat-header">
                <div className="stat-icon-wrapper">
                    {icon}
                </div>
            </div>
            <div className="stat-content">
                <h3 className="stat-title">{title}</h3>
                <div className="stat-value">{value}</div>
            </div>
        </motion.div>
    );
};

export default StatCard;
