import React, { useState, useEffect } from 'react';
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
                const step = (100 - prev) / 10;
                return Math.min(prev + step, 95);
            });
        }, 80);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="loading-container">
            {/* Background Static Orbs */}
            <div
                className="loading-bg-orb"
                style={{ top: '10%', left: '10%' }}
            />
            <div
                className="loading-bg-orb"
                style={{ bottom: '15%', right: '10%', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0) 70%)' }}
            />

            {/* Logo Section */}
            <div className="loading-logo-wrapper">
                <div className="loading-logo-glow"></div>
                <div>
                    <img src={lfiLogo} alt="RhaegarSystems Logo" className="loading-logo" />
                </div>
            </div>

            {/* Progress Bar Section */}
            <div className="loading-progress-container" style={{ width: 240, opacity: 1 }}>
                <div 
                    className="loading-progress-bar"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Text Section */}
            <div className="loading-text">
                Initializing System<span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
            </div>
        </div>
    );
};

export default LoadingScreen;
