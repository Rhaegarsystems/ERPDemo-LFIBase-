import React from 'react';
import { NavLink } from 'react-router-dom';
import lfiLogo from '../assets/logo_ai.png';
import {
    LayoutDashboard,
    Package,
    BoxSelect,
    Users,
    FileText,
    Settings,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import '../styles/Sidebar.css';

const Sidebar = ({ isCollapsed, toggleSidebar }) => {
    const navItems = [
        { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
        { name: 'Parts', path: '/inventory', icon: <Package size={20} /> },
        { name: 'Customers', path: '/customers', icon: <Users size={20} /> },
        { name: 'Invoices', path: '/invoices', icon: <FileText size={20} /> },
        { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
    ];

    return (
        <aside
            className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
            style={{ width: isCollapsed ? 80 : 280 }}
        >
            <div className="sidebar-header">
                <div className="brand-wrapper">
                    <img src={lfiLogo} alt="LFI" className="brand-logo" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain' }} />
                    {!isCollapsed && (
                        <span
                            className="brand-subtitle"
                            style={{ marginLeft: '10px' }}
                        >
                            Little Flower Industries
                        </span>
                    )}
                </div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        title={isCollapsed ? item.name : ''}
                    >
                        <div className="icon-wrapper">{item.icon}</div>
                        {!isCollapsed && (
                            <span>
                                {item.name}
                            </span>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button className="nav-item" onClick={toggleSidebar}>
                    <div className="icon-wrapper">
                        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </div>
                    {!isCollapsed && (
                        <span>
                            Collapse
                        </span>
                    )}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
