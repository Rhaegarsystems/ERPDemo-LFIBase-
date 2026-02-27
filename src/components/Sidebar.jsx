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
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ isCollapsed, toggleSidebar }) => {
    const navItems = [
        { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
        { name: 'Parts', path: '/inventory', icon: <Package size={20} /> },
        { name: 'Customers', path: '/customers', icon: <Users size={20} /> },
        { name: 'Invoices', path: '/invoices', icon: <FileText size={20} /> },
        { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
    ];

    return (
        <motion.aside
            className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
            animate={{ width: isCollapsed ? 80 : 280 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
        >
            <div className="sidebar-header">
                <div className="brand-wrapper">
                    <img src={lfiLogo} alt="LFI" className="brand-logo" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain' }} />
                    <AnimatePresence>
                        {!isCollapsed && (
                            <motion.span
                                className="brand-subtitle"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ marginLeft: '10px' }}
                            >
                                Little Flower Industries
                            </motion.span>
                        )}
                    </AnimatePresence>
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
                        <AnimatePresence>
                            {!isCollapsed && (
                                <motion.span
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                >
                                    {item.name}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button className="nav-item" onClick={toggleSidebar}>
                    <div className="icon-wrapper">
                        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </div>
                    <AnimatePresence>
                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                            >
                                Collapse
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </div>
        </motion.aside>
    );
};

export default Sidebar;
