import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from './theme';

// Import components with correct names
import Navbar from './components/Navbar';
import Login from './components/Login';
import Signup from './components/Signup';
import DashboardStudent from './components/DashboardStudent';
import DashboardAdmin from './components/DashboardAdmin';
import DashboardSuperAdmin from './components/DashboardSuperAdmin';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  // Dark mode state with localStorage persistence
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true' || false;
  });

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Create theme based on mode
  const theme = useMemo(() => getTheme(darkMode ? 'dark' : 'light'), [darkMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Protected Routes */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRole="student">
                <DashboardStudent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRole="college_admin">
                <DashboardAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin"
            element={
              <ProtectedRoute allowedRole="super_admin">
                <DashboardSuperAdmin />
              </ProtectedRoute>
            }
          />
          
          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
