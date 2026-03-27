import React from 'react';
import '../styles/StatCard.css';

// Simplified StatCard - no dummy change/trend values
const StatCard = ({ title, value, icon }) => {
    return (
        <div className="stat-card">
            <div className="stat-header">
                <div className="stat-icon-wrapper">
                    {icon}
                </div>
            </div>
            <div className="stat-content">
                <h3 className="stat-title">{title}</h3>
                <div className="stat-value">{value}</div>
            </div>
        </div>
    );
};

export default StatCard;
