import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Bell,
    ShieldAlert,
    Settings,
    FileText,
    Play,
    Activity,
    Menu,
    ChevronLeft
} from 'lucide-react';
import { useTraffic } from '../context/TrafficContext';

const Sidebar = () => {
    const { emergency, alerts } = useTraffic();
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();

    // Auto-collapse on smaller screens if needed, but for now manual toggle
    const toggleSidebar = () => {
        setCollapsed(!collapsed);
        // Dispatch custom event if layout needs to adjust (though CSS handles margin)
        document.documentElement.style.setProperty('--sidebar-width', collapsed ? '260px' : '72px');
    };

    const hasActiveAlert = alerts?.current?.severity && alerts.current.severity !== 'normal';

    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/simulation', label: 'Simulation', icon: Play },
        { path: '/alerts', label: 'Live Alerts', icon: Bell },
        { path: '/violations', label: 'Violations', icon: ShieldAlert },
        { path: '/summary', label: 'Intelligence', icon: FileText },
        { path: '/config', label: 'Configuration', icon: Settings },
    ];

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} style={{
            width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(24px)',
            borderRight: '1px solid var(--glass-border)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100,
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
            {/* Logo Area */}
            <div className="sidebar-header" style={{
                height: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                padding: collapsed ? '0' : '0 1.5rem',
                borderBottom: '1px solid var(--glass-border)',
            }}>
                {!collapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 15px rgba(59, 130, 246, 0.3)'
                        }}>
                            <Activity size={18} color="white" />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
                            Smart Traffic <span style={{ color: 'var(--primary)' }}>AI</span>
                        </span>
                    </div>
                )}

                <button onClick={toggleSidebar} style={{
                    background: 'transparent', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', padding: '0.5rem', display: 'flex'
                }}>
                    {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav" style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        title={collapsed ? item.label : ''}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.85rem 1rem',
                            borderRadius: '10px',
                            color: isActive ? 'white' : 'var(--text-muted)',
                            background: isActive ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05))' : 'transparent',
                            border: isActive ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent',
                            textDecoration: 'none',
                            transition: 'all 0.2s',
                            position: 'relative',
                            justifyContent: collapsed ? 'center' : 'flex-start'
                        })}
                    >
                        <item.icon size={20} style={{
                            color: location.pathname === item.path ? 'var(--primary)' : 'inherit',
                            filter: location.pathname === item.path ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.4))' : 'none'
                        }} />

                        {!collapsed && <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{item.label}</span>}

                        {/* Badges */}
                        {item.label === 'Live Alerts' && (hasActiveAlert || emergency.active) && (
                            <div style={{
                                position: collapsed ? 'absolute' : 'relative',
                                top: collapsed ? '4px' : 'auto',
                                right: collapsed ? '4px' : 'auto',
                                marginLeft: collapsed ? 0 : 'auto',
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: emergency.active ? 'var(--danger)' : 'var(--warning)',
                                boxShadow: `0 0 8px ${emergency.active ? 'var(--danger)' : 'var(--warning)'}`
                            }} />
                        )}
                    </NavLink>
                ))}
            </nav>


        </aside>
    );
};

export default Sidebar;
