import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Monitor, Info, Code, Cpu, Calendar, Shield } from 'lucide-react';
import '../styles/PageCommon.css';

const Settings = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="page-content">
            <header className="page-header">
                <div>
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="page-title"
                    >
                        Settings
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-muted"
                    >
                        Manage your application preferences
                    </motion.p>
                </div>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Appearance Card */}
                <motion.div
                    className="card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <Monitor size={22} style={{ color: 'var(--primary)' }} />
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Appearance</h2>
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {theme === 'light'
                                    ? <Sun size={24} style={{ color: '#f59e0b' }} />
                                    : <Moon size={24} style={{ color: 'var(--primary)' }} />
                                }
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>App Theme</h3>
                                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                                </p>
                            </div>
                        </div>

                        <label className="theme-toggle">
                            <input
                                type="checkbox"
                                checked={theme === 'dark'}
                                onChange={toggleTheme}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </motion.div>

                {/* System Info Card - Detailed */}
                <motion.div
                    className="card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <Info size={22} style={{ color: 'var(--text-secondary)' }} />
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>About This App</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* App Name & Version */}
                        <div style={{
                            padding: '1rem',
                            background: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)'
                        }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                                Little Flower Industries ERP
                            </h3>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                A comprehensive Enterprise Resource Planning solution designed for managing inventory, customers, invoicing, and stock movements.
                            </p>
                        </div>

                        {/* Technical Details Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem 1rem',
                                background: 'var(--bg-tertiary)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)'
                            }}>
                                <Code size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Version</p>
                                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>1.1.0</p>
                                </div>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem 1rem',
                                background: 'var(--bg-tertiary)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)'
                            }}>
                                <Cpu size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Framework</p>
                                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>Tauri 2.0 + React 19</p>
                                </div>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem 1rem',
                                background: 'var(--bg-tertiary)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)'
                            }}>
                                <Shield size={18} style={{ color: '#3b82f6', flexShrink: 0 }} />
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Database</p>
                                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>SQLite (Local)</p>
                                </div>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem 1rem',
                                background: 'var(--bg-tertiary)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)'
                            }}>
                                <Calendar size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Build</p>
                                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>Feb 2026</p>
                                </div>
                            </div>
                        </div>

                        {/* Built by Rhaegarsystems */}
                        <div style={{
                            padding: '1.25rem',
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            textAlign: 'center',
                            maxWidth: '300px',
                            margin: '0 auto'
                        }}>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                Built and maintained by
                            </p>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>
                                Rhaegarsystems
                            </p>
                        </div>

                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                            © 2026 Little Flower Industries. All rights reserved.
                        </p>
                    </div>
                </motion.div>
            </div>

            <style>{`
                .theme-toggle {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 26px;
                }
                
                .theme-toggle input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .theme-toggle .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: var(--bg-secondary);
                    border: 1px solid var(--border);
                    transition: 0.3s;
                    border-radius: 34px;
                }
                
                .theme-toggle .slider:before {
                    position: absolute;
                    content: "";
                    height: 20px;
                    width: 20px;
                    left: 2px;
                    bottom: 2px;
                    background-color: var(--text-primary);
                    transition: 0.3s;
                    border-radius: 50%;
                }
                
                .theme-toggle input:checked + .slider {
                    background-color: var(--primary);
                    border-color: var(--primary);
                }
                
                .theme-toggle input:checked + .slider:before {
                    transform: translateX(24px);
                    background-color: white;
                }
            `}</style>
        </div>
    );
};

export default Settings;
