import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Background from './components/Background';
import './styles/Layout.css';

const Layout = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className={`app-layout ${isCollapsed ? 'collapsed' : ''}`}>
            <Background />
            <Sidebar isCollapsed={isCollapsed} toggleSidebar={() => setIsCollapsed(!isCollapsed)} />
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
