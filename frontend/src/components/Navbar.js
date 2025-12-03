import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Button,
  Tooltip,
  MenuItem,
  useTheme,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Event as EventIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';

const Navbar = ({ darkMode, setDarkMode }) => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('userName') || 'User';
  const theme = useTheme();

  const [anchorElUser, setAnchorElUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleOpenUserMenu = (event) => setAnchorElUser(event.currentTarget);
  const handleCloseUserMenu = () => setAnchorElUser(null);
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const navItems = [
    { label: 'Dashboard', path: role === 'student' ? '/student' : role === 'college_admin' ? '/admin' : '/super-admin', icon: <DashboardIcon /> },
    { label: 'Events', path: '/events', icon: <EventIcon /> },
  ];

  const drawer = (
    <Box sx={{ width: 250 }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <EventIcon color="primary" sx={{ fontSize: 32 }} />
        <Typography variant="h6" fontWeight={700}>
          EventHub
        </Typography>
      </Box>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem
            button
            key={item.label}
            onClick={() => {
              navigate(item.path);
              setMobileOpen(false);
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar
        position="sticky"
        elevation={scrolled ? 4 : 0}
        sx={{
          background: scrolled
            ? theme.palette.mode === 'light'
              ? 'rgba(255, 255, 255, 0.9)'
              : 'rgba(26, 26, 46, 0.9)'
            : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          transition: 'all 0.3s ease',
          borderBottom: scrolled ? `1px solid ${theme.palette.divider}` : 'none',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            {/* Logo - Desktop */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1, mr: 4 }}>
              <EventIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography
                variant="h6"
                noWrap
                component={Link}
                to="/"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #1976d2 30%, #9c27b0 90%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textDecoration: 'none',
                }}
              >
                College EventHub
              </Typography>
            </Box>

            {/* Mobile Menu Icon */}
            <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
              <IconButton
                size="large"
                onClick={handleDrawerToggle}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
            </Box>

            {/* Logo - Mobile */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexGrow: 1, alignItems: 'center', gap: 1 }}>
              <EventIcon sx={{ fontSize: 28, color: 'primary.main' }} />
              <Typography
                variant="h6"
                noWrap
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #1976d2 30%, #9c27b0 90%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                EventHub
              </Typography>
            </Box>

            {/* Desktop Navigation */}
            {token && (
              <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 1 }}>
                {navItems.map((item) => (
                  <Button
                    key={item.label}
                    component={Link}
                    to={item.path}
                    startIcon={item.icon}
                    sx={{
                      color: 'text.primary',
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Box>
            )}

            {/* Right Side Actions */}
            <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Dark Mode Toggle */}
              <Tooltip title={darkMode ? 'Light Mode' : 'Dark Mode'}>
                <IconButton onClick={() => setDarkMode(!darkMode)} color="inherit">
                  {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </Tooltip>

              {token ? (
                <>
                  {/* Notifications */}
                  <Tooltip title="Notifications">
                    <IconButton color="inherit">
                      <Badge badgeContent={3} color="error">
                        <NotificationsIcon />
                      </Badge>
                    </IconButton>
                  </Tooltip>

                  {/* User Menu */}
                  <Tooltip title="Account">
                    <IconButton onClick={handleOpenUserMenu} sx={{ p: 0, ml: 1 }}>
                      <Avatar
                        sx={{
                          bgcolor: 'primary.main',
                          width: 40,
                          height: 40,
                          fontWeight: 600,
                          border: '2px solid',
                          borderColor: 'primary.light',
                        }}
                      >
                        {getInitials(userName)}
                      </Avatar>
                    </IconButton>
                  </Tooltip>

                  <Menu
                    anchorEl={anchorElUser}
                    open={Boolean(anchorElUser)}
                    onClose={handleCloseUserMenu}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    sx={{ mt: 1 }}
                    PaperProps={{
                      sx: {
                        borderRadius: 2,
                        minWidth: 200,
                        boxShadow: '0px 8px 24px rgba(0,0,0,0.12)',
                      },
                    }}
                  >
                    <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {userName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {role?.replace('_', ' ').toUpperCase()}
                      </Typography>
                    </Box>
                    <Divider />
                    <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                      <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
                      Logout
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    component={Link}
                    to="/login"
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                  >
                    Login
                  </Button>
                  <Button
                    component={Link}
                    to="/signup"
                    variant="contained"
                    sx={{ borderRadius: 2 }}
                  >
                    Sign Up
                  </Button>
                </Box>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 250 },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default Navbar;
