import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import lfiLogo from '../assets/logo_ai.png';
import '../styles/LoadingScreen.css';

const LoadingScreen = () => {
    const [progress, setProgress] = useState(0);

    // Dynamic progress bar to make it feel active
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) return prev;
                // Slower as it gets near the end to look realistic
                const step = (100 - prev) / 15;
                return Math.min(prev + step, 95);
            });
        }, 120);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="loading-container">
            {/* Background Animated Blobs */}
            <motion.div
                className="loading-bg-orb"
                animate={{
                    x: [0, 100, -100, 0],
                    y: [0, -100, 100, 0],
                    scale: [1, 1.2, 0.8, 1],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                style={{ top: '10%', left: '10%' }}
            />
            <motion.div
                className="loading-bg-orb"
                animate={{
                    x: [0, -120, 120, 0],
                    y: [0, 80, -80, 0],
                    scale: [1.1, 0.9, 1.2, 1.1],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                style={{ bottom: '15%', right: '10%', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0) 70%)' }}
            />

            {/* Logo Section */}
            <div className="loading-logo-wrapper">
                <div className="loading-logo-glow"></div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.8, ease: "circOut" }}
                >
                    <img src={lfiLogo} alt="LFI Logo" className="loading-logo" />
                </motion.div>
            </div>

            {/* Progress Bar Section */}
            <motion.div 
                className="loading-progress-container"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 240, opacity: 1 }}
                transition={{ duration: 1, delay: 0.2 }}
            >
                <motion.div 
                    className="loading-progress-bar"
                    animate={{ width: `${progress}%` }}
                    transition={{ type: "spring", stiffness: 50, damping: 20 }}
                />
            </motion.div>

            {/* Text Section */}
            <motion.div
                className="loading-text"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
            >
                Initializing System<span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
            </motion.div>
        </div>
    );
};

export default LoadingScreen;
