import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Monitor, Info, Code, Cpu, Calendar, Shield, Database, Download, Upload, Cloud, CloudOff, RefreshCw, LogOut, Terminal, Copy } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import AlertModal from '../components/AlertModal';
import '../styles/PageCommon.css';
import '../styles/Settings.css';

const Settings = () => {
    const { theme, toggleTheme } = useTheme();
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'success', title: '', message: '' });
    const [isConnected, setIsConnected] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Developer Mode State
    const [versionClicks, setVersionClicks] = useState(0);
    const [showPinPrompt, setShowPinPrompt] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [isDevMode, setIsDevMode] = useState(false);
    const [dbKey, setDbKey] = useState('');

    useEffect(() => {
        const checkConnection = async () => {
            try {
                const connected = await invoke('is_google_drive_connected');
                setIsConnected(connected);
            } catch (e) {
                console.error("Failed to check GDrive connection:", e);
            }
        };
        checkConnection();
    }, []);

    useEffect(() => {
        if (isDevMode) {
            const fetchKey = async () => {
                try {
                    const key = await invoke('get_database_key');
                    setDbKey(key);
                } catch (e) {
                    console.error("Failed to fetch DB key:", e);
                }
            };
            fetchKey();
        }
    }, [isDevMode]);

    const handleVersionClick = () => {
        if (isDevMode) return;
        const newClicks = versionClicks + 1;
        setVersionClicks(newClicks);
        if (newClicks >= 5) {
            setShowPinPrompt(true);
            setVersionClicks(0);
        }
    };

    const handlePinSubmit = async () => {
        try {
            const actualPin = await invoke('get_dev_pin');
            if (pinInput === actualPin) {
                setIsDevMode(true);
                setShowPinPrompt(false);
                setPinInput('');
                setAlertConfig({ isOpen: true, type: 'success', title: 'Developer Mode', message: 'Developer tools have been enabled.' });
            } else {
                setAlertConfig({ isOpen: true, type: 'error', title: 'Invalid PIN', message: 'The developer PIN you entered is incorrect.' });
                setPinInput('');
            }
        } catch (e) {
            setAlertConfig({ isOpen: true, type: 'error', title: 'Error', message: String(e) });
        }
    };

    const copyToClipboard = async (text) => {
        try {
            await writeText(text);
            setAlertConfig({ isOpen: true, type: 'success', title: 'Copied', message: 'Encryption key copied to clipboard.' });
        } catch (e) {
            console.error(e);
        }
    };

    const handleBackup = async () => {
        try {
            const filePath = await save({
                filters: [{ name: 'Database', extensions: ['db'] }],
                defaultPath: 'littleflower_backup.db'
            });

            if (filePath) {
                await invoke('export_db', { path: filePath });
                setAlertConfig({ isOpen: true, type: 'success', title: 'Local Backup Successful', message: `Database backed up to ${filePath}.` });
            }
        } catch (e) {
            setAlertConfig({ isOpen: true, type: 'error', title: 'Backup Failed', message: String(e) });
        }
    };

    const handleRestore = async () => {
        try {
            const filePath = await open({
                filters: [{ name: 'Database', extensions: ['db'] }],
                multiple: false
            });

            if (filePath) {
                await invoke('import_db', { path: filePath });
                setAlertConfig({ isOpen: true, type: 'success', title: 'Restore Successful', message: 'Database restored. Please restart the application to apply changes.' });
            }
        } catch (e) {
            setAlertConfig({ isOpen: true, type: 'error', title: 'Restore Failed', message: String(e) });
        }
    };

    const handleConnectGDrive = async () => {
        try {
            const result = await invoke('connect_google_drive');
            setIsConnected(true);
            setAlertConfig({ isOpen: true, type: 'success', title: 'Google Drive Connected', message: result });
        } catch (e) {
            setAlertConfig({ isOpen: true, type: 'error', title: 'Connection Failed', message: String(e) });
        }
    };

    const handleGDriveBackup = async () => {
        setIsSyncing(true);
        try {
            const result = await invoke('backup_now');
            setAlertConfig({ isOpen: true, type: 'success', title: 'Cloud Backup Successful', message: result });
        } catch (e) {
            setAlertConfig({ isOpen: true, type: 'error', title: 'Cloud Backup Failed', message: String(e) });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleGDriveRestore = async () => {
        setIsSyncing(true);
        try {
            const result = await invoke('restore_now');
            setAlertConfig({ isOpen: true, type: 'success', title: 'Cloud Restore Successful', message: result });
        } catch (e) {
            setAlertConfig({ isOpen: true, type: 'error', title: 'Cloud Restore Failed', message: String(e) });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDisconnectGDrive = async () => {
        try {
            await invoke('disconnect_google_drive');
            setIsConnected(false);
            setAlertConfig({ isOpen: true, type: 'success', title: 'Disconnected', message: 'Successfully disconnected from Google Drive.' });
        } catch (e) {
            setAlertConfig({ isOpen: true, type: 'error', title: 'Error', message: String(e) });
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

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
                        className="page-subtitle"
                    >
                        Manage your application preferences and data
                    </motion.p>
                </div>
            </header>

            <motion.div 
                className="settings-container"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Appearance Card */}
                <motion.div className="settings-card" variants={itemVariants}>
                    <div className="settings-card-header">
                        <div className="settings-card-icon">
                            <Monitor size={20} />
                        </div>
                        <h2 className="settings-card-title">Appearance</h2>
                    </div>

                    <div className="settings-section">
                        <div className="appearance-toggle-row">
                            <div className="appearance-info">
                                <div className="appearance-icon-box">
                                    {theme === 'light'
                                        ? <Sun size={22} style={{ color: '#f59e0b' }} />
                                        : <Moon size={22} style={{ color: 'var(--primary)' }} />
                                    }
                                </div>
                                <div className="appearance-text">
                                    <h3>App Theme</h3>
                                    <p>Switch between light and dark modes.</p>
                                </div>
                            </div>

                            <label className="settings-toggle">
                                <input
                                    type="checkbox"
                                    checked={theme === 'dark'}
                                    onChange={toggleTheme}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>
                    </div>
                    
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 'auto' }}>
                        Visual preferences are saved locally and persist across sessions.
                    </p>
                </motion.div>

                {/* Data Management Card */}
                <motion.div className="settings-card" variants={itemVariants} style={{ height: 'auto' }}>
                    <div className="settings-card-header">
                        <div className="settings-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                            <Database size={20} />
                        </div>
                        <h2 className="settings-card-title">Cloud Backup (Google Drive)</h2>
                    </div>

                    <div className="settings-section">
                        {!isConnected ? (
                            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                                <div style={{ 
                                    width: '60px', 
                                    height: '60px', 
                                    borderRadius: '50%', 
                                    background: 'rgba(107, 114, 128, 0.1)', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    margin: '0 auto 1rem'
                                }}>
                                    <CloudOff size={30} style={{ color: 'var(--text-muted)' }} />
                                </div>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                    Connect your Google account to enable automatic cloud backups and cross-device synchronization.
                                </p>
                                <button className="btn-primary-glow" onClick={handleConnectGDrive} style={{ width: '100%' }}>
                                    <Cloud size={18} /> Connect Google Drive
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.75rem', 
                                    padding: '0.75rem',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: '1.5rem',
                                    border: '1px solid rgba(16, 185, 129, 0.2)'
                                }}>
                                    <Cloud size={20} style={{ color: '#10b981' }} />
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>Connected to Google Drive</p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cloud synchronization active</p>
                                    </div>
                                    <button 
                                        onClick={handleDisconnectGDrive}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                        title="Disconnect account"
                                    >
                                        <LogOut size={16} />
                                    </button>
                                </div>

                                <div className="database-actions" style={{ marginBottom: '1rem' }}>
                                    <button 
                                        className="btn-glass" 
                                        onClick={handleGDriveBackup} 
                                        disabled={isSyncing}
                                        style={{ justifyContent: 'center', padding: '0.8rem', flex: 1 }}
                                    >
                                        {isSyncing ? <RefreshCw size={18} className="spin" /> : <Upload size={18} />} 
                                        {isSyncing ? 'Syncing...' : 'Backup to Cloud'}
                                    </button>
                                    <button 
                                        className="btn-glass" 
                                        onClick={handleGDriveRestore} 
                                        disabled={isSyncing}
                                        style={{ justifyContent: 'center', padding: '0.8rem', flex: 1 }}
                                    >
                                        {isSyncing ? <RefreshCw size={18} className="spin" /> : <Download size={18} />} 
                                        {isSyncing ? 'Syncing...' : 'Restore from Cloud'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
                            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Local Backup</p>
                            <div className="database-actions">
                                <button className="btn-glass" onClick={handleBackup} style={{ justifyContent: 'center', padding: '0.6rem', fontSize: '0.8rem' }}>
                                    <Download size={16} /> Export DB
                                </button>
                                <button className="btn-glass" onClick={handleRestore} style={{ justifyContent: 'center', padding: '0.6rem', fontSize: '0.8rem' }}>
                                    <Upload size={16} /> Import DB
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* System Info Card */}
                <motion.div className="settings-card" variants={itemVariants} style={{ gridColumn: '1 / -1' }}>
                    <div className="settings-card-header">
                        <div className="settings-card-icon" style={{ background: 'rgba(107, 114, 128, 0.1)', color: 'var(--text-secondary)' }}>
                            <Info size={20} />
                        </div>
                        <h2 className="settings-card-title">About This Application</h2>
                    </div>

                    <div className="about-header">
                        <h3 className="about-app-name">Little Flower Industries</h3>
                        <p className="about-description">
                            A comprehensive solution designed for managing inventory, customers, and invoicing.
                        </p>
                    </div>

                    <div className="tech-info-grid">
                        <div className="tech-info-item" onClick={handleVersionClick} style={{ cursor: 'pointer' }}>
                            <Code size={18} className="tech-info-icon" />
                            <div>
                                <p className="tech-info-label">Version</p>
                                <p className="tech-info-value">1.2.0</p>
                            </div>
                        </div>

                        <div className="tech-info-item">
                            <Calendar size={18} className="tech-info-icon" style={{ color: '#f59e0b' }} />
                            <div>
                                <p className="tech-info-label">Build Date</p>
                                <p className="tech-info-value">Feb 2026</p>
                            </div>
                        </div>
                    </div>

                    {/* PIN Prompt Section */}
                    {showPinPrompt && !isDevMode && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            style={{ 
                                marginTop: '1.5rem', 
                                padding: '1rem', 
                                background: 'rgba(139, 92, 246, 0.1)', 
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--primary)'
                            }}
                        >
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Enter 10-digit Developer PIN:</p>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input 
                                    type="password" 
                                    maxLength={10}
                                    value={pinInput}
                                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Enter PIN"
                                    className="form-input"
                                    style={{ textAlign: 'center', letterSpacing: '0.5em', fontWeight: 'bold' }}
                                />
                                <button className="btn-primary-glow" onClick={handlePinSubmit}>Unlock</button>
                                <button className="btn-ghost" onClick={() => { setShowPinPrompt(false); setPinInput(''); }}>Cancel</button>
                            </div>
                        </motion.div>
                    )}

                    {/* Hidden Developer Section */}
                    {isDevMode && (
                        <div style={{ 
                            marginTop: '2rem', 
                            padding: '1.5rem', 
                            background: 'rgba(0, 0, 0, 0.2)', 
                            border: '1px solid var(--border)', 
                            borderRadius: 'var(--radius-md)' 
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>
                                <Terminal size={18} />
                                <h4 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Developer Tools</h4>
                            </div>
                            
                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Database Encryption Key</label>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={dbKey} 
                                        className="form-input" 
                                        style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--bg-tertiary)' }} 
                                    />
                                    <button 
                                        className="btn-glass" 
                                        onClick={() => copyToClipboard(dbKey)}
                                        style={{ padding: '0 1rem' }}
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                    Use this key with "DB Browser for SQLite" (SQLCipher version) to open the database file manually.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="developer-tag">
                        <p className="dev-label">Built and maintained by</p>
                        <p className="dev-name">Rhaegarsystems</p>
                        <p className="copyright">© 2026 Little Flower Industries. All rights reserved.</p>
                    </div>
                </motion.div>
            </motion.div>

            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
            />
        </div>
    );
};

export default Settings;
