import React, { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import '../styles/WindowControls.css';

const WindowControls = () => {
    const [appWindow, setAppWindow] = useState(null);

    useEffect(() => {
        try {
            setAppWindow(getCurrentWindow());
        } catch (e) {
            console.error("Failed to get current window:", e);
        }
    }, []);

    const handleMinimize = () => appWindow?.minimize();
    const handleMaximize = () => appWindow?.toggleMaximize();
    const handleClose = () => appWindow?.close();

    return (
        <div className="window-controls-container" style={{ WebkitAppRegion: 'no-drag' }}>
            {appWindow && (
                <div className="window-controls">
                    <button className="control-btn minimize" onClick={handleMinimize} title="Minimize" />
                    <button className="control-btn maximize" onClick={handleMaximize} title="Maximize" />
                    <button className="control-btn close" onClick={handleClose} title="Close" />
                </div>
            )}
        </div>
    );
};

export default WindowControls;
