import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Monitor, Laptop } from 'lucide-react';
import '../styles/PageCommon.css'; // Reusing common page styles

const Settings = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="page-content">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Settings</h1>
                    <p className="text-muted">Manage your application preferences</p>
                </div>
            </header>

            <div className="flex flex-col gap-4">
                {/* Appearance Card */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <Monitor className="text-primary" size={24} />
                        <h2 className="text-lg">Appearance</h2>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
                                {theme === 'light' ? <Sun size={24} className="text-warning" /> : <Moon size={24} className="text-primary" />}
                            </div>
                            <div>
                                <h3 className="font-medium" style={{ margin: 0, fontSize: '1rem' }}>App Theme</h3>
                                <p className="text-muted text-sm" style={{ margin: 0 }}>
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
                </div>

                {/* System Info Card (Placeholder for Windows 11 feel) */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <Laptop className="text-secondary" size={24} />
                        <h2 className="text-lg">System</h2>
                    </div>
                    <div className="text-muted">
                        <p>Little Flower ERP v0.1.0</p>
                        <p className="text-sm">Running on Tauri + React</p>
                    </div>
                </div>
            </div>

            <style>{`
                /* Simple CSS for the Toggle Switch directly in component for now */
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
                
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #cbd5e1; /* Slate 300 */
                    transition: .4s;
                    border-radius: 34px;
                }
                
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 20px;
                    width: 20px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                }
                
                input:checked + .slider {
                    background-color: var(--primary);
                }
                
                input:focus + .slider {
                    box-shadow: 0 0 1px var(--primary);
                }
                
                input:checked + .slider:before {
                    transform: translateX(24px);
                }
            `}</style>
        </div>
    );
};

export default Settings;
