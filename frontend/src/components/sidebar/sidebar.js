import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar, Menu, MenuItem } from 'react-pro-sidebar';
import './sidebar.css';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars, faHome, faUtensils, faUserFriends,
  faBox, faCarrot, faCoffee, faTshirt, faEnvelope, faTruck, faMotorcycle
} from '@fortawesome/free-solid-svg-icons';

function SidebarComponent() {
  // Initialize state from localStorage or default to false
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const location = useLocation();

  // Save to localStorage whenever collapsed state changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  const toggleSidebar = () => setCollapsed(!collapsed);

  return (
    <div className="sidebar-wrapper">
      {/* Sidebar Panel */}
      <Sidebar collapsed={collapsed} className={`sidebar-container ${collapsed ? 'ps-collapsed' : ''}`}>
        <div className="side-container">
          <div className={`logo-wrapper ${collapsed ? 'collapsed' : ''}`}>
            <img src={logo} alt="Logo" className="logo" />
          </div>

          {!collapsed && <div className="section-title">GENERAL</div>}
          <Menu>
            <MenuItem
              icon={<FontAwesomeIcon icon={faHome} />}
              component={<Link to="/dashboard" />}
              active={location.pathname === '/dashboard'}
            >
              Dashboard
            </MenuItem>
            <MenuItem
              icon={<FontAwesomeIcon icon={faUserFriends} />}
              component={<Link to="/Usermanagement" />}
              active={location.pathname === '/Usermanagement'}
            >
              Users
            </MenuItem>
          </Menu>
        </div>
      </Sidebar>

      {/* TOGGLE BUTTON ON THE RIGHT OF SIDEBAR */}
      <button className="toggle-btn-right" onClick={toggleSidebar}>
        <FontAwesomeIcon icon={faBars} />
      </button>
    </div>
  );
}

export default SidebarComponent;