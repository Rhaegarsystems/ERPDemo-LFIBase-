import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Monitor, Info, Code, Calendar, Shield, Database, Download, Upload, Cloud, RefreshCw, Terminal, Copy, Archive, FileText, Check, ChevronRight, Lock } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastProvider';
import brandLogo from '../assets/Logo.png';
import '../styles/PageCommon.css';
import '../styles/Settings.css';

const Settings = () => {
    const { theme, setTheme, toggleTheme, variant, changeVariant, autoOpenPdf, toggleAutoOpenPdf } = useTheme();
    const toast = useToast();
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [latestBackup, setLatestBackup] = useState(null);
    // Fake backup list for demo
    const [backupList] = useState([
        { key: 'backup_20260501_120000.enc', last_modified: '2026-05-01T12:00:00' },
        { key: 'backup_20260430_180000.enc', last_modified: '2026-04-30T18:00:00' },
        { key: 'backup_20260429_090000.enc', last_modified: '2026-04-29T09:00:00' },
    ]);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordMode, setPasswordMode] = useState('setup');
    const [backupPassword, setBackupPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordSet, setIsPasswordSet] = useState(false);
    
    // Developer Mode State
    const [versionClicks, setVersionClicks] = useState(0);
    const [showPinPrompt, setShowPinPrompt] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [isDevMode, setIsDevMode] = useState(false);
    const [dbKey, setDbKey] = useState('');

    useEffect(() => {
        const checkPassword = async () => {
            try {
                const pw = await invoke('get_backup_password');
                setIsPasswordSet(!!pw);
            } catch (e) {
                setIsPasswordSet(false);
            }
        };
        checkPassword();
    }, []);

    const handlePasswordSubmit = async () => {
        if (passwordMode === 'setup') {
            if (backupPassword.length < 6) {
                toast.error('Password Too Short', 'Password must be at least 6 characters');
                return;
            }
            if (backupPassword !== confirmPassword) {
                toast.error('Password Mismatch', 'Passwords do not match');
                return;
            }
            try {
                await invoke('set_backup_password', { password: backupPassword });
                setIsPasswordSet(true);
                setShowPasswordModal(false);
                toast.success('Password Set', 'Your backup password has been configured');
            } catch (e) {
                toast.error('Error', String(e));
            }
        } else {
            try {
                await invoke('set_backup_password', { password: backupPassword });
                setShowPasswordModal(false);
                toast.success('Password Verified', 'You can now restore backups');
            } catch (e) {
                toast.error('Invalid Password', 'Please enter the correct backup password');
            }
        }
    };

    const handleCloudBackup = async () => {
        // Disabled in Demo
        return;
    };

    const handleCloudRestore = async () => {
        // Disabled in Demo
        return;
    };

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
                defaultPath: 'rhaegar_backup.db'
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
            <header className="dashboard-header" style={{ marginBottom: '6rem', marginTop: 0 }}>
                <div>
                    <h1 className="greeting-text" style={{ marginTop: 0 }}>Settings</h1>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-muted)', fontSize: '1.1rem' }}>Personalize your experience and manage data</p>
                </div>
            </header>

            <div className="settings-container">
                {/* Appearance Section */}
                <div className="settings-section-wrapper">
                    <h2 className="settings-section-title">
                        <Monitor size={18} /> Appearance
                    </h2>
                    
                    <div className="settings-row">
                        <div className="settings-row-info">
                            <p className="settings-row-label">Interface Theme</p>
                            <p className="settings-row-description">Switch between light and dark modes.</p>
                        </div>
                        <div className="settings-row-action">
                            <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                <button
                                    onClick={() => setTheme('light')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px',
                                        background: theme === 'light' ? 'var(--primary)' : 'transparent',
                                        color: theme === 'light' ? 'white' : 'var(--text-secondary)',
                                        border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s'
                                    }}
                                >
                                    <Sun size={14} /> Light
                                </button>
                                <button
                                    onClick={() => setTheme('dark')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px',
                                        background: theme === 'dark' ? 'var(--primary)' : 'transparent',
                                        color: theme === 'dark' ? 'white' : 'var(--text-secondary)',
                                        border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s'
                                    }}
                                >
                                    <Moon size={14} /> Dark
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                        <div className="settings-row-info">
                            <p className="settings-row-label">Accent Color</p>
                            <p className="settings-row-description">Personalize the application with a preset color palette.</p>
                        </div>
                        <div className="presets-grid">
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
                                    className={`preset-button ${variant === v.id ? 'active' : ''}`}
                                >
                                    <div className="color-dot" style={{ background: v.color }} />
                                    {v.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Preferences Section */}
                <div className="settings-section-wrapper">
                    <h2 className="settings-section-title">
                        <Shield size={18} /> Preferences
                    </h2>
                    
                    <div className="settings-row">
                        <div className="settings-row-info">
                            <p className="settings-row-label">Auto-Open PDF</p>
                            <p className="settings-row-description">Automatically open the system's default PDF viewer after generating an invoice.</p>
                        </div>
                        <div className="settings-row-action">
                            <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                <button
                                    onClick={() => !autoOpenPdf && toggleAutoOpenPdf()}
                                    style={{
                                        padding: '8px 20px', borderRadius: '8px',
                                        background: autoOpenPdf ? 'var(--primary)' : 'transparent',
                                        color: autoOpenPdf ? 'white' : 'var(--text-secondary)',
                                        border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s'
                                    }}
                                >
                                    ON
                                </button>
                                <button
                                    onClick={() => autoOpenPdf && toggleAutoOpenPdf()}
                                    style={{
                                        padding: '8px 20px', borderRadius: '8px',
                                        background: !autoOpenPdf ? 'var(--primary)' : 'transparent',
                                        color: !autoOpenPdf ? 'white' : 'var(--text-secondary)',
                                        border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s'
                                    }}
                                >
                                    OFF
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="settings-section-wrapper">
                    <div className="locked-overlay">
                        <div className="locked-message">
                            <Lock size={16} style={{ marginRight: '8px' }} />
                            Backup is Locked in Demo
                        </div>
                    </div>
                    <h2 className="settings-section-title">
                        <Database size={18} /> Cloud & Data
                    </h2>

                    <div className="settings-row">
                        <div className="settings-row-info">
                            <p className="settings-row-label">Cloud Synchronization</p>
                            <p className="settings-row-description">
                                Cloud backup and restore features are available in the full version.
                            </p>
                        </div>
                        <div className="settings-row-action">
                            <button className="btn-ghost" disabled style={{ gap: '8px', opacity: 0.6, cursor: 'not-allowed' }}>
                                <Shield size={14} /> Configure Access
                            </button>
                        </div>
                    </div>

                    {/* Fake Backup History */}
                    <div className="backup-info-box" style={{ opacity: 0.8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Archive size={14} style={{ color: 'var(--primary)' }} /> Recent Cloud Backups (Demo)
                            </p>
                        </div>

                        <div className="backup-history-list">
                            {backupList.map((backup, index) => (
                                <div key={index} className="backup-history-item">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
                                        <span style={{ fontWeight: 500 }}>{backup.key.split('/').pop()}</span>
                                    </div>
                                    <span style={{ color: 'var(--text-muted)' }}>
                                        {new Date(backup.last_modified).toLocaleDateString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', fontStyle: 'italic' }}>
                            These are sample backup entries. Connect to cloud to manage real backups.
                        </p>
                    </div>
                </div>

                {/* About Section */}
                <div className="settings-section-wrapper">
                    <h2 className="settings-section-title">
                        <Info size={18} /> About
                    </h2>
                    
                    <div className="about-modern">
                        <div className="about-branding">
                            <div className="about-logo-placeholder" style={{ background: 'transparent', boxShadow: 'none' }}>
                                <img src="/Logo%203.png" alt="RhaegarSystems Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                            <div className="about-text">
                                <h2>RhaegarSystems ERP Demo</h2>
                                <p>Industrial-grade inventory and invoicing management system built for reliability and performance.</p>
                            </div>
                        </div>

                        <div className="tech-grid-modern">
                            <div className="tech-card-modern" onClick={handleVersionClick} style={{ cursor: 'pointer' }}>
                                <span className="label">System Version</span>
                                <span className="value">v1.0 (Demo)</span>
                            </div>
                            <div className="tech-card-modern">
                                <span className="label">Build Date</span>
                                <span className="value">April 2026</span>
                            </div>
                        </div>

                        {/* Dev Tools PIN */}
                        {showPinPrompt && !isDevMode && (
                            <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-lg)' }}>
                                <p style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>Unlock Developer Tools</p>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <input 
                                        type="password" maxLength={10} value={pinInput}
                                        onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Enter PIN" className="form-input" style={{ textAlign: 'center', letterSpacing: '0.4em' }}
                                    />
                                    <button className="btn-primary-glow" onClick={handlePinSubmit}>Unlock</button>
                                    <button className="btn-ghost" onClick={() => setShowPinPrompt(false)}>Cancel</button>
                                </div>
                            </div>
                        )}

                        {/* Developer Mode Tools */}
                        {isDevMode && (
                            <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', position: 'relative' }}>
                                <div className="locked-overlay">
                                    <div className="locked-message">
                                        <Lock size={16} style={{ marginRight: '8px' }} />
                                        Data Export is Locked in Demo
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
                                    <Terminal size={18} />
                                    <p style={{ margin: 0, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.8rem' }}>Developer Mode Active</p>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Encryption Key</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <input type="text" readOnly value={dbKey} className="form-input" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} />
                                            <button className="btn-ghost" onClick={() => copyToClipboard(dbKey)}><Copy size={16} /></button>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button className="btn-ghost" onClick={handleLocalBackup} style={{ flex: 1 }} disabled={true}><Archive size={14} /> Export DB</button>
                                        <button className="btn-ghost" onClick={handleLocalRestore} style={{ flex: 1 }} disabled={true}><Upload size={14} /> Import DB</button>
                                    </div>
                                    
                                    <button className="btn-ghost" onClick={() => setIsResetModalOpen(true)} style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }} disabled={true}>
                                        <RefreshCw size={14} /> Wipe All Local Data
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="dev-footer-modern">
                            <p className="built-by">Engineered and maintained by</p>
                            <p 
                                className="brand" 
                                onClick={async () => {
                                    try {
                                        await invoke('open_file', { path: 'https://www.rhaegarsystems.com' });
                                    } catch (e) {
                                        console.error("Failed to open website:", e);
                                    }
                                }}
                                style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                                RHAEGARSYSTEMS
                            </p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>© 2026 RhaegarSystems. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </div>

            <DeleteConfirmationModal
                isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)}
                onConfirm={handleResetDatabase} itemName="ALL local database data and encryption keys" title="Reset Database"
            />

            <Modal
                isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)}
                title={passwordMode === 'setup' ? 'Set Backup Password' : 'Verify Password'}
                actions={
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-ghost" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                        <button className="btn-primary-glow" onClick={handlePasswordSubmit}>{passwordMode === 'setup' ? 'Set Password' : 'Verify'}</button>
                    </div>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                        {passwordMode === 'setup' ? 'Create a password to encrypt your cloud backups.' : 'Enter your password to unlock cloud restoration.'}
                    </p>
                    <input
                        type="password" className="form-input" value={backupPassword}
                        onChange={(e) => setBackupPassword(e.target.value)} placeholder="Password"
                    />
                    {passwordMode === 'setup' && (
                        <input
                            type="password" className="form-input" value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password"
                        />
                    )}
                </div>
            </Modal>

            <Modal
                isOpen={isRestoreModalOpen} onClose={() => setIsRestoreModalOpen(false)}
                title="Cloud Restore"
                actions={<button className="btn-ghost" onClick={() => setIsRestoreModalOpen(false)}>Close</button>}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {backupList.map((backup, index) => (
                        <div 
                            key={index} onClick={() => setSelectedBackup(backup)}
                            style={{ 
                                padding: '1rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                                border: '1px solid ' + (selectedBackup?.key === backup.key ? 'var(--primary)' : 'var(--glass-border)'),
                                background: selectedBackup?.key === backup.key ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Archive size={16} style={{ color: 'var(--primary)' }} />
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{backup.key.split('/').pop()}</span>
                                </div>
                                {selectedBackup?.key === backup.key && (
                                    <button 
                                        className="btn-primary-glow" style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                                        onClick={(e) => { e.stopPropagation(); handleRestoreConfirm(); }}
                                    >
                                        Restore
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
};

export default Settings;
