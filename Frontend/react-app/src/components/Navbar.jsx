import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, FileText, Activity } from 'lucide-react';

const Navbar = () => {
    const location = useLocation();

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <h1>Spartanz Monitor</h1>
            </div>
            <ul className="navbar-nav">
                <li className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
                    <Link to="/" className="nav-link">
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </Link>
                </li>
                <li className={`nav-item ${location.pathname === '/configuration' ? 'active' : ''}`}>
                    <Link to="/configuration" className="nav-link">
                        <Settings size={20} />
                        <span>Configuration</span>
                    </Link>
                </li>
                <li className={`nav-item ${location.pathname === '/summary' ? 'active' : ''}`}>
                    <Link to="/summary" className="nav-link">
                        <FileText size={20} />
                        <span>Summary</span>
                    </Link>
                </li>
                <li className={`nav-item ${location.pathname === '/simulation' ? 'active' : ''}`}>
                    <Link to="/simulation" className="nav-link">
                        <Activity size={20} />
                        <span>Simulation</span>
                    </Link>
                </li>
            </ul>
        </nav>
    );
};

export default Navbar;
