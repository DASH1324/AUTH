import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import "../dashboard/dashboard.css";
import Sidebar from "../sidebar/sidebar";
import Header from "../sidebar/header";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faUserPlus,
  faUserCheck,
  faUserClock,
  faArrowTrendUp,
  faArrowTrendDown
} from '@fortawesome/free-solid-svg-icons';

// User activity data over months
const userActivityData = [
  { name: 'Jan', activeUsers: 1250, newRegistrations: 180 },
  { name: 'Feb', activeUsers: 1420, newRegistrations: 220 },
  { name: 'Mar', activeUsers: 1680, newRegistrations: 310 },
  { name: 'Apr', activeUsers: 1590, newRegistrations: 280 },
  { name: 'May', activeUsers: 1750, newRegistrations: 340 },
  { name: 'June', activeUsers: 1920, newRegistrations: 420 },
  { name: 'July', activeUsers: 2100, newRegistrations: 380 },
];

// Daily user engagement for the week
const dailyEngagementData = [
  { name: 'Mon', logins: 850 },
  { name: 'Tue', logins: 920 },
  { name: 'Wed', logins: 780 },
  { name: 'Thu', logins: 690 },
  { name: 'Fri', logins: 950 },
  { name: 'Sat', logins: 620 },
  { name: 'Sun', logins: 580 },
];

// Users by Role data
const usersByRoleData = [
  { name: 'Admin', value: 45, color: '#dc3545' },
  { name: 'Manager', value: 156, color: '#fd7e14' },
  { name: 'Employee', value: 3200, color: '#007bff' },
  { name: 'Contractor', value: 890, color: '#28a745' },
  { name: 'Guest', value: 234, color: '#6f42c1' },
  { name: 'Viewer', value: 1122, color: '#20c997' }
];

// Users by System data
const usersBySystemData = [
  { name: 'Web Portal', users: 4521, color: '#007bff' },
  { name: 'Mobile App', users: 3456, color: '#28a745' },
  { name: 'Desktop Client', users: 2234, color: '#fd7e14' },
  { name: 'API Access', users: 1456, color: '#6f42c1' },
  { name: 'Third Party', users: 1180, color: '#dc3545' }
];

// User management summary cards
const summaryCardData = [
  {
    title: "Total Users",
    current: 12847,
    previous: 12200,
    format: "number",
    icon: faUsers,
    type: "users"
  },
  {
    title: "New Registrations",
    current: 234,
    previous: 189,
    format: "number",
    icon: faUserPlus,
    type: "registrations"
  },
  {
    title: "Active Users Today",
    current: 8456,
    previous: 8200,
    format: "number",
    icon: faUserCheck,
    type: "active"
  },
  {
    title: "Pending Approvals",
    current: 18,
    previous: 25,
    format: "number",
    icon: faUserClock,
    type: "pending"
  }
];

const formatValue = (value, format) => {
  return format === "currency"
    ? `₱${value.toLocaleString()}`
    : value.toLocaleString();
};

// Custom label function for pie chart
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return percent > 0.05 ? (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
      fontWeight="600"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
};

const Dashboard = () => {
  const [activityFilter, setActivityFilter] = useState("Monthly");
  const [engagementFilter, setEngagementFilter] = useState("Weekly");
  const [roleFilter, setRoleFilter] = useState("All");
  const [systemFilter, setSystemFilter] = useState("Monthly");
  
  // Track sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });

  // Listen for sidebar state changes
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      if (saved !== null) {
        setSidebarCollapsed(JSON.parse(saved));
      }
    };

    // Listen for localStorage changes
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for changes from the same tab
    const interval = setInterval(() => {
      const saved = localStorage.getItem('sidebarCollapsed');
      if (saved !== null) {
        const newState = JSON.parse(saved);
        if (newState !== sidebarCollapsed) {
          setSidebarCollapsed(newState);
        }
      }
    }, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [sidebarCollapsed]);

  return (
    <div className="dashboard">
      <Sidebar />
      <main className={`dashboard-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header pageTitle="Dashboard" />

        <div className="dashboard-contents">
          <div className="dashboard-cards">
            {summaryCardData.map((card, index) => {
              const { current, previous } = card;
              const diff = current - previous;
              const percent = previous !== 0 ? (diff / previous) * 100 : 0;
              const isImproved = current > previous;
              const hasChange = current !== previous;

              return (
                <div key={index} className={`card ${card.type}`}>
                  <div className="card-text">
                    <div className="card-title">{card.title}</div>
                    <div className="card-details">
                      <div className="card-value">{formatValue(current, card.format)}</div>
                      {hasChange && (
                        <div className={`card-percent ${isImproved ? 'green' : 'red'}`}>
                          <FontAwesomeIcon icon={isImproved ? faArrowTrendUp : faArrowTrendDown} />
                             {Math.abs(percent).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="card-icon">
                    <FontAwesomeIcon icon={card.icon} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="dashboard-charts">
            <div className="chart-box">
              <div className="chart-header">
                <span>User Activity & Growth</span>
                <select
                  className="chart-dropdown"
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={userActivityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="activeUsers" 
                    stroke="#00b4d8" 
                    strokeWidth={2}
                    name="Active Users"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="newRegistrations" 
                    stroke="#28a745" 
                    strokeWidth={2}
                    name="New Registrations"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-box">
              <div className="chart-header">
                <span>Daily User Logins</span>
                <select
                  className="chart-dropdown"
                  value={engagementFilter}
                  onChange={(e) => setEngagementFilter(e.target.value)}
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={dailyEngagementData}>
                  <defs>
                    <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00b4d8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#00b4d8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="logins"
                    stroke="#00b4d8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorLogins)"
                    name="Daily Logins"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* New Row for Role and System Analytics */}
          <div className="dashboard-charts">
            <div className="chart-box">
              <div className="chart-header">
                <span>Users by Role</span>
                <select
                  className="chart-dropdown"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="All">All Roles</option>
                  <option value="Active">Active Only</option>
                  <option value="Recent">Recent 30 Days</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={usersByRoleData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {usersByRoleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [`${value.toLocaleString()} users`, name]}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value, entry) => (
                      <span style={{ color: entry.color }}>
                        {value} ({entry.payload.value.toLocaleString()})
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-box">
              <div className="chart-header">
                <span>Users by System</span>
                <select
                  className="chart-dropdown"
                  value={systemFilter}
                  onChange={(e) => setSystemFilter(e.target.value)}
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart 
                  data={usersBySystemData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`${value.toLocaleString()} users`, 'Users']}
                  />
                  <Bar 
                    dataKey="users" 
                    fill="#007bff"
                    radius={[4, 4, 0, 0]}
                  >
                    {usersBySystemData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;