import React from 'react';
import { motion } from 'framer-motion';
import '../styles/Background.css';

const Background = () => {
    return (
        <div className="fixed-background">
            <div className="gradient-orb orb-1" />
            <div className="gradient-orb orb-2" />
            <div className="gradient-orb orb-3" />
            <div className="noise-overlay" />
        </div>
    );
};

export default Background;
