import React from 'react';
import '../styles/Background.css';

// Simplified static background - no animations for snappy performance
const Background = () => {
    return (
        <div className="fixed-background">
            <div className="static-gradient" />
        </div>
    );
};

export default Background;
