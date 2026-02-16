import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, FileText, Play, Bell, ShieldAlert } from 'lucide-react';
import { useTraffic } from '../context/TrafficContext';

const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/alerts', label: 'Alerts', icon: Bell },
    { path: '/violations', label: 'Violations', icon: ShieldAlert },
    { path: '/config', label: 'Config', icon: Settings },
    { path: '/summary', label: 'Summary', icon: FileText },
    { path: '/simulation', label: 'Simulation', icon: Play },
];

const Navbar = () => {
    const location = useLocation();
    const { emergency, alerts } = useTraffic();
    const hasActiveAlert = alerts?.current?.severity && alerts.current.severity !== 'normal';

    return (
        <nav className="navbar">
            <div className="nav-brand">
                <h1>🚦 Kochi Traffic AI</h1>
            </div>
            <div className="nav-links">
                {navItems.map(item => (
                    <Link 
                        key={item.path}
                        to={item.path} 
                        className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                    >
                        <item.icon size={16} />
                        <span>{item.label}</span>
                        {item.label === 'Alerts' && hasActiveAlert && (
                            <span className="nav-alert-dot"></span>
                        )}
                        {item.label === 'Alerts' && emergency?.active && (
                            <span className="nav-emergency-dot"></span>
                        )}
                    </Link>
                ))}
            </div>
        </nav>
    );
};

export default Navbar;
