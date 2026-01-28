import React from 'react';
import { motion } from 'framer-motion';
import reactLogo from '../assets/react.svg';

const LoadingScreen = () => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: '#1a1a1a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            >
                <img src={reactLogo} alt="Loading..." style={{ width: '100px', height: '100px', marginBottom: '20px' }} />
            </motion.div>
            <motion.div
                style={{ width: '200px', height: '4px', background: '#374151', borderRadius: '2px', overflow: 'hidden' }}
            >
                <motion.div
                    style={{ width: '100%', height: '100%', background: '#8b5cf6' }}
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                />
            </motion.div>
            <p style={{ marginTop: '10px', color: '#e5e7eb', fontFamily: 'Inter, sans-serif' }}>Initializing...</p>
        </div>
    );
};

export default LoadingScreen;
