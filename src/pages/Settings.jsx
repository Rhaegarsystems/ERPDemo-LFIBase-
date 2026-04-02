import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Monitor, Info, Code, Calendar, Shield, Database, Download, Upload, Cloud, RefreshCw, Terminal, Copy, Archive, FileText, Check } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastProvider';
import '../styles/PageCommon.css';
import '../styles/Settings.css';

const Settings = () => {
    const { theme, setTheme, toggleTheme, variant, changeVariant, autoOpenPdf, toggleAutoOpenPdf } = useTheme();
    const toast = useToast();
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [latestBackup, setLatestBackup] = useState(null);
    const [backupList, setBackupList] = useState([]);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState(null);
    
    // Developer Mode State
    const [versionClicks, setVersionClicks] = useState(0);
    const [showPinPrompt, setShowPinPrompt] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [isDevMode, setIsDevMode] = useState(false);
    const [dbKey, setDbKey] = useState('');

    const fetchLatestBackupInfo = async () => {
        try {
            const info = await invoke('get_latest_backup_info');
            setLatestBackup(info);
        } catch (e) {
            setLatestBackup(null);
        }
    };

    const fetchBackupList = async () => {
        try {
            const list = await invoke('list_cloud_backups');
            setBackupList(list || []);
        } catch (e) {
            setBackupList([]);
        }
    };

    useEffect(() => {
        const checkConnection = async () => {
            try {
                // Keep calling the same command, but interpret generically in UI
                const connected = await invoke('is_google_drive_connected');
                setIsConnected(connected);
                if (connected) {
                    fetchLatestBackupInfo();
                    fetchBackupList();
                }
            } catch (e) {
                console.error("Failed to check Cloud configuration:", e);
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
                toast.success('Developer Mode', 'Developer tools have been enabled.');
            } else {
                toast.error('Invalid PIN', 'The developer PIN you entered is incorrect.');
                setPinInput('');
            }
        } catch (e) {
            toast.error('Error', String(e));
        }
    };

    const copyToClipboard = async (text) => {
        try {
            await writeText(text);
            toast.success('Copied', 'Encryption key copied to clipboard.');
        } catch (e) {
            console.error(e);
        }
    };

    const handleLocalBackup = async () => {
        try {
            const filePath = await save({
                filters: [{ name: 'Database', extensions: ['db'] }],
                defaultPath: 'littleflower_backup.db'
            });

            if (filePath) {
                await invoke('export_db', { path: filePath });
                toast.success('Local Backup Successful', `Database backed up to ${filePath}.`);
            }
        } catch (e) {
            toast.error('Backup Failed', String(e));
        }
    };

    const handleLocalRestore = async () => {
        try {
            const filePath = await open({
                filters: [{ name: 'Database', extensions: ['db'] }],
                multiple: false
            });

            if (filePath) {
                await invoke('import_db', { path: filePath });
                toast.success('Restore Successful', 'Database restored. Please restart the application to apply changes.');
            }
        } catch (e) {
            toast.error('Restore Failed', String(e));
        }
    };

    const handleCloudBackup = async () => {
        setIsSyncing(true);
        try {
            const result = await invoke('backup_now');
            toast.success('Cloud Backup Successful', result);
            fetchLatestBackupInfo();
        } catch (e) {
            toast.error('Cloud Backup Failed', String(e));
        } finally {
            setIsSyncing(false);
        }
    };

    const handleCloudRestore = async () => {
        await fetchBackupList();
        setIsRestoreModalOpen(true);
    };

    const handleRestoreConfirm = async () => {
        if (!selectedBackup) {
            toast.error('Please select a backup to restore');
            return;
        }
        setIsRestoring(true);
        try {
            const result = await invoke('restore_backup_file', { fileName: selectedBackup.key });
            toast.success('Restore Successful', result);
            setIsRestoreModalOpen(false);
            setSelectedBackup(null);
            fetchLatestBackupInfo();
        } catch (e) {
            toast.error('Restore Failed', String(e));
        } finally {
            setIsRestoring(false);
        }
    };

    const handleResetDatabase = async () => {
        try {
            await invoke('reset_database');
            setIsResetModalOpen(false);
            toast.success('Database Reset', 'All local data and encryption keys have been cleared.');
        } catch (e) {
            toast.error('Reset Failed', String(e));
        }
    };

    return (
        <div className="page-content">
            <header className="page-header">
                <div>
                    <h1 className="page-title">
                        Settings
                    </h1>
                    <p className="page-subtitle">
                        Manage your application preferences and data
                    </p>
                </div>
            </header>

            <div className="settings-container">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Appearance Card */}
                    <div className="settings-card">
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
                                        <p>Choose your preferred theme.</p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => theme !== 'light' && setTheme('light')}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '10px',
                                            border: theme === 'light' ? '2px solid #6366f1' : '1px solid var(--border)',
                                            background: theme === 'light' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <Sun size={20} style={{ color: theme === 'light' ? '#6366f1' : 'var(--text-muted)' }} />
                                    </button>
                                    <button
                                        onClick={() => theme !== 'dark' && setTheme('dark')}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '10px',
                                            border: theme === 'dark' ? '2px solid #6366f1' : '1px solid var(--border)',
                                            background: theme === 'dark' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <Moon size={20} style={{ color: theme === 'dark' ? '#6366f1' : 'var(--text-muted)' }} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 'auto' }}>
                            Visual preferences are saved locally and persist across sessions.
                        </p>
                    </div>

                    {/* PDF Preferences Card */}
                    <div className="settings-card">
                        <div className="settings-card-header">
                            <div className="settings-card-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                                <FileText size={20} />
                            </div>
                            <h2 className="settings-card-title">Preferences</h2>
                        </div>

                        <div className="settings-section">
                            <div className="appearance-toggle-row">
                                <div className="appearance-info">
                                    <div className="appearance-icon-box" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                                        <FileText size={22} style={{ color: '#3b82f6' }} />
                                    </div>
                                    <div className="appearance-text">
                                        <h3>Auto-Open PDF</h3>
                                        <p>Open PDF automatically after saving.</p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => !autoOpenPdf && toggleAutoOpenPdf()}
                                        style={{
                                            padding: '6px 16px',
                                            borderRadius: '8px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            border: autoOpenPdf ? '2px solid var(--primary)' : '1px solid var(--border)',
                                            background: autoOpenPdf ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                            color: autoOpenPdf ? 'var(--primary)' : 'var(--text-muted)',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        ON
                                    </button>
                                    <button
                                        onClick={() => autoOpenPdf && toggleAutoOpenPdf()}
                                        style={{
                                            padding: '6px 16px',
                                            borderRadius: '8px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            border: !autoOpenPdf ? '2px solid #ef4444' : '1px solid var(--border)',
                                            background: !autoOpenPdf ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                                            color: !autoOpenPdf ? '#ef4444' : 'var(--text-muted)',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        OFF
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 'auto' }}>
                            Control document handling behavior.
                        </p>
                    </div>
                </div>

                {/* Theme Presets Card */}
                <div className="settings-card">
                    <div className="settings-card-header">
                        <div className="settings-card-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                            <RefreshCw size={20} />
                        </div>
                        <h2 className="settings-card-title">Theme Presets</h2>
                    </div>

                    <div className="settings-section">
                        <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                            {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                            {(theme === 'light' 
                                ? [
                                    { id: 'default', label: 'Default', color: '#6366f1' },
                                    { id: 'blue', label: 'Sky Blue', color: '#0ea5e9' },
                                    { id: 'emerald', label: 'Emerald', color: '#10b981' },
                                    { id: 'rose', label: 'Rose Pink', color: '#f43f5e' },
                                    { id: 'amber', label: 'Amber Gold', color: '#f59e0b' },
                                  ]
                                : [
                                    { id: 'default', label: 'Slate', color: '#818cf8' },
                                    { id: 'midnight', label: 'Midnight', color: '#c084fc' },
                                    { id: 'oled', label: 'OLED Black', color: '#38bdf8' },
                                    { id: 'ocean', label: 'Ocean', color: '#0ea5e9' },
                                    { id: 'forest', label: 'Forest', color: '#10b981' },
                                  ]
                            ).map((v) => (
                                <button
                                    key={v.id}
                                    onClick={() => changeVariant(v.id)}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '10px 6px',
                                        borderRadius: '10px',
                                        border: variant === v.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                                        background: variant === v.id ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-secondary)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: v.color, border: '1px solid rgba(255,255,255,0.1)' }} />
                                    <span style={{ fontSize: '0.7rem', fontWeight: 500, color: variant === v.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{v.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'auto' }}>
                        Customize your theme color.
                    </p>
                </div>

                {/* Cloud Backup Card - Intermediate */}
                <div className="settings-card">
                    <div className="settings-card-header">
                        <div className="settings-card-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary)' }}>
                            <Cloud size={20} />
                        </div>
                        <h2 className="settings-card-title">Cloud Backup</h2>
                    </div>

                    <div className="settings-section">
                        {!isConnected ? (
                            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                                <Shield size={24} style={{ color: 'var(--danger)', marginBottom: '0.5rem' }} />
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                                    Configure credentials to enable
                                </p>
                            </div>
                        ) : (
                            <div>
                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <button 
                                        onClick={handleCloudBackup} 
                                        disabled={isSyncing}
                                        style={{ 
                                            flex: 1,
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            gap: '0.4rem',
                                            padding: '0.65rem',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, var(--primary) 0%, #818cf8 100%)',
                                            color: 'white',
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            cursor: isSyncing ? 'not-allowed' : 'pointer',
                                            opacity: isSyncing ? 0.7 : 1,
                                            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)'
                                        }}
                                    >
                                        {isSyncing ? <RefreshCw size={12} className="spin" /> : <Upload size={12} />}
                                        {isSyncing ? 'Uploading...' : 'Backup Now'}
                                    </button>
                                    <button 
                                        onClick={handleCloudRestore} 
                                        disabled={isSyncing}
                                        style={{ 
                                            flex: 1,
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            gap: '0.4rem',
                                            padding: '0.65rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            background: 'transparent',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            cursor: isSyncing ? 'not-allowed' : 'pointer',
                                            opacity: isSyncing ? 0.7 : 1
                                        }}
                                    >
                                        {isSyncing ? <RefreshCw size={12} className="spin" /> : <Download size={12} />}
                                        {isSyncing ? 'Downloading...' : 'Restore'}
                                    </button>
                                </div>

                                {/* Backup History */}
                                <div style={{ 
                                    background: 'var(--bg-secondary)', 
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ 
                                        padding: '0.5rem 0.75rem', 
                                        borderBottom: '1px solid var(--border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem'
                                    }}>
                                        <Archive size={12} style={{ color: 'var(--text-muted)' }} />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                            Backup History
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {backupList.length > 0 ? (
                                            backupList.slice(0, 8).map((backup, index) => (
                                                <div 
                                                    key={index}
                                                    style={{ 
                                                        padding: '0.5rem 0.75rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        borderBottom: index < Math.min(backupList.length, 8) - 1 ? '1px solid var(--border)' : 'none'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                                        <Database size={12} style={{ color: 'var(--primary)' }} />
                                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-primary)' }}>
                                                            {backup.key.split('/').pop()}
                                                        </span>
                                                    </div>
                                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                        {backup.last_modified ? new Date(backup.last_modified).toLocaleDateString() : ''}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ padding: '1rem', textAlign: 'center' }}>
                                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                                                    No backups yet
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 'auto' }}>
                        {latestBackup ? `Last backup: ${latestBackup}` : 'Encrypted backup to cloud'}
                    </p>
                </div>

                {/* System Info Card */}
                <div className="settings-card" style={{ gridColumn: '1 / -1' }}>
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
                                <p className="tech-info-value">1.6.0</p>
                            </div>
                        </div>

                        <div className="tech-info-item">
                            <Calendar size={18} className="tech-info-icon" style={{ color: '#f59e0b' }} />
                            <div>
                                <p className="tech-info-label">Build Date</p>
                                <p className="tech-info-value">March 2026</p>
                            </div>
                        </div>
                    </div>

                    {/* PIN Prompt Section */}
                    {showPinPrompt && !isDevMode && (
                        <div 
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
                        </div>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
                                <Terminal size={18} />
                                <h4 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Developer Tools</h4>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                {/* Database Key Section */}
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
                                        Encryption key for manual database access.
                                    </p>
                                </div>

                                {/* Local Backup Section - PROTECTED BY PIN */}
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Advanced Data Management</label>
                                    <div className="database-actions" style={{ marginTop: '0.5rem' }}>
                                        <button className="btn-glass" onClick={handleLocalBackup} style={{ justifyContent: 'center', padding: '0.6rem', fontSize: '0.8rem', flex: 1 }}>
                                            <Archive size={16} /> Export Local
                                        </button>
                                        <button className="btn-glass" onClick={handleLocalRestore} style={{ justifyContent: 'center', padding: '0.6rem', fontSize: '0.8rem', flex: 1 }}>
                                            <Upload size={16} /> Import Local
                                        </button>
                                    </div>
                                    <div style={{ marginTop: '1rem' }}>
                                        <button 
                                            className="btn-glass" 
                                            onClick={() => setIsResetModalOpen(true)}
                                            style={{ 
                                                justifyContent: 'center', 
                                                padding: '0.6rem', 
                                                fontSize: '0.8rem', 
                                                width: '100%',
                                                color: '#ef4444',
                                                background: 'rgba(239, 68, 68, 0.05)',
                                                borderColor: 'rgba(239, 68, 68, 0.1)'
                                            }}
                                        >
                                            <RefreshCw size={16} /> Reset Database (Delete All Data)
                                        </button>
                                    </div>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                        Manually export, restore, or completely wipe local database files.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="developer-tag">
                        <p className="dev-label">Built and maintained by</p>
                        <p className="dev-name">Rhaegarsystems</p>
                        <p className="copyright">© 2026 Little Flower Industries. All rights reserved.</p>
                    </div>
                </div>
            </div>

            <DeleteConfirmationModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onConfirm={handleResetDatabase}
                itemName="ALL local database data and encryption keys"
                title="Reset Database"
            />

            {/* Restore Backup Modal */}
            <Modal
                isOpen={isRestoreModalOpen}
                onClose={() => { setIsRestoreModalOpen(false); setSelectedBackup(null); }}
                title="Select Backup to Restore"
                actions={
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                            className="btn-ghost" 
                            onClick={() => { setIsRestoreModalOpen(false); setSelectedBackup(null); }}
                        >
                            Cancel
                        </button>
                        <button 
                            className="btn-primary-glow" 
                            onClick={handleRestoreConfirm}
                            disabled={!selectedBackup || isRestoring}
                            style={{ opacity: (!selectedBackup || isRestoring) ? 0.5 : 1 }}
                        >
                            {isRestoring ? <RefreshCw size={14} className="spin" /> : <Check size={14} />}
                            {isRestoring ? 'Restoring...' : 'Restore'}
                        </button>
                    </div>
                }
            >
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {backupList.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {backupList.map((backup, index) => (
                                <div 
                                    key={index}
                                    onClick={() => setSelectedBackup(backup)}
                                    style={{ 
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        border: selectedBackup?.key === backup.key 
                                            ? '2px solid var(--primary)' 
                                            : '1px solid var(--border)',
                                        background: selectedBackup?.key === backup.key 
                                            ? 'rgba(99, 102, 241, 0.1)' 
                                            : 'var(--bg-secondary)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Database size={16} style={{ color: 'var(--primary)' }} />
                                        <div>
                                            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                                                {backup.key.split('/').pop()}
                                            </p>
                                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                {backup.last_modified ? new Date(backup.last_modified).toLocaleString() : ''}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedBackup?.key === backup.key && (
                                        <Check size={16} style={{ color: 'var(--primary)' }} />
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <Archive size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                                No backups found
                            </p>
                        </div>
                    )}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                    The application will restart after restore to load the restored data.
                </p>
            </Modal>
        </div>
    );
};

export default Settings;
