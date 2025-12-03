import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import {
  Box, Typography, Grid, Paper, Alert, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Card, CardContent, 
  Tabs, Tab, Chip, Select, MenuItem, FormControl, 
  Container, Skeleton, Fade, Avatar} from '@mui/material';
import {
  Person as PersonIcon, School as SchoolIcon, Event as EventIcon,
  Timeline as TimelineIcon, 
  People as PeopleIcon, SupervisorAccount as SupervisorAccountIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';

const COLORS = ['#667eea', '#764ba2', '#4ecdc4', '#f59e0b'];

// ✅ FIX: Define complete default structure with ALL properties
const defaultStats = {
  users: {
    total: 0,
    students: 0,
    admins: 0,
    super_admins: 0
  },
  events: {
    total_events: 0,
    colleges_with_events: 0,
    total_registrations: 0,
    approved_registrations: 0
  },
  topColleges: [],
  recentActivity: [],
  // ✅ Add missing properties to prevent undefined errors
  user_stats: {
    total_users: 0,
    students: 0,
    college_admins: 0,
    super_admins: 0
  },
  event_stats: {
    total_events: 0,
    by_category: []
  },
  registration_stats: {
    total_registrations: 0,
    pending: 0,
    approved: 0
  },
  colleges: []
};

const defaultAnalytics = {
  roleDistribution: [
    { name: 'Students', value: 0 },
    { name: 'College Admins', value: 0 },
    { name: 'Super Admins', value: 0 }
  ],
  eventsByCollege: [],
  registrationTrends: []
};

const DashboardSuperAdmin = () => {
  const [stats, setStats] = useState(defaultStats);
  const [analytics, setAnalytics] = useState(defaultAnalytics);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [processingUser, setProcessingUser] = useState(null);

  const userName = localStorage.getItem('userName') || 'Super Admin';

  // ✅ FIX: Proper async function with correct closing brace
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/stats');
      console.log('Stats response:', res.data);

      if (!res.data) {
        throw new Error('No data received from server');
      }

      const { users = {}, events = {}, topColleges = [], recentActivity = [] } = res.data;

      // ✅ Transform the data to match our complete state structure
      const transformedStats = {
        users: {
          total: parseInt(users.total) || 0,
          students: parseInt(users.students) || 0,
          admins: parseInt(users.admins) || 0,
          super_admins: parseInt(users.super_admins) || 0
        },
        events: {
          total_events: parseInt(events.total_events) || 0,
          colleges_with_events: parseInt(events.colleges_with_events) || 0,
          total_registrations: parseInt(events.total_registrations) || 0,
          approved_registrations: parseInt(events.approved_registrations) || 0
        },
        topColleges: topColleges || [],
        recentActivity: recentActivity || [],
        // ✅ Also set the alternative property names
        user_stats: {
          total_users: parseInt(users.total) || 0,
          students: parseInt(users.students) || 0,
          college_admins: parseInt(users.admins) || 0,
          super_admins: parseInt(users.super_admins) || 0
        },
        event_stats: {
          total_events: parseInt(events.total_events) || 0,
          by_category: events.by_category || []
        },
        registration_stats: {
          total_registrations: parseInt(events.total_registrations) || 0,
          pending: parseInt(events.pending) || 0,
          approved: parseInt(events.approved_registrations) || 0
        },
        colleges: topColleges || []
      };

      setStats(transformedStats);

      // ✅ Prepare analytics data with safe checks
      const roleDistribution = [
        { name: 'Students', value: Math.max(0, parseInt(transformedStats.users.students) || 0) },
        { name: 'College Admins', value: Math.max(0, parseInt(transformedStats.users.admins) || 0) },
        { name: 'Super Admins', value: Math.max(0, parseInt(transformedStats.users.super_admins) || 0) }
      ].filter(item => item.value > 0);

      const eventsByCollege = (transformedStats.topColleges || [])
        .map(college => ({
          name: college?.college || 'Unknown',
          events: Math.max(0, parseInt(college?.event_count) || 0)
        }))
        .filter(item => item.events > 0)
        .slice(0, 5); // Limit to top 5

      setAnalytics({
        roleDistribution: roleDistribution.length > 0 ? roleDistribution : defaultAnalytics.roleDistribution,
        eventsByCollege: eventsByCollege.length > 0 ? eventsByCollege : [],
        registrationTrends: []
      });
    } catch (err) {
      console.error('Stats error:', err);
      setError(err.response?.data?.message || 'Failed to fetch statistics.');
      setStats(defaultStats);
      setAnalytics(defaultAnalytics);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ FIX: Proper async function with correct closing brace
  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/admin/users');
      console.log('Users response:', res.data);
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Users error:', err);
      setError(err.response?.data?.message || 'Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, [fetchStats, fetchUsers]);

  // ✅ FIX: Proper async function with correct closing brace
  const updateUserRole = async (userId, newRole) => {
    try {
      setProcessingUser(userId);
      const res = await api.put(`/admin/users/${userId}/role`, { role: newRole });
      console.log('Role update response:', res.data);
      await fetchUsers();
      setError('');
    } catch (err) {
      console.error('Role update error:', err);
      setError(err.response?.data?.message || 'Failed to update user role.');
    } finally {
      setProcessingUser(null);
    }
  }; // ✅ Closing brace

  // ✅ FIX: Proper function with correct closing brace
  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin':
        return 'error';
      case 'college_admin':
        return 'warning';
      case 'student':
        return 'success';
      default:
        return 'default';
    }
  }; // ✅ Closing brace

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 4, mb: 3 }} />
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} md={6} lg={3} key={i}>
              <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 4 }} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Hero Section */}
        <Fade in timeout={800}>
          <Paper
            elevation={0}
            sx={{
              p: 4,
              mb: 4,
              borderRadius: 4,
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography variant="h3" fontWeight={700} gutterBottom>
                Welcome, {userName}! 👑
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                System-wide management and analytics
              </Typography>
            </Box>
          </Paper>
        </Fade>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Total Users
                    </Typography>
                    <Typography variant="h3" fontWeight={700}>
                      {stats?.users?.total || stats?.user_stats?.total_users || 0}
                    </Typography>
                    <Typography variant="caption" color="success.main">
                      Active accounts
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#667eea', width: 64, height: 64 }}>
                    <PeopleIcon fontSize="large" />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Students
                    </Typography>
                    <Typography variant="h3" fontWeight={700}>
                      {stats?.users?.students || stats?.user_stats?.students || 0}
                    </Typography>
                    <Typography variant="caption" color="success.main">
                      Registered students
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#4ecdc4', width: 64, height: 64 }}>
                    <PersonIcon fontSize="large" />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      College Admins
                    </Typography>
                    <Typography variant="h3" fontWeight={700}>
                      {stats?.users?.admins || stats?.user_stats?.college_admins || 0}
                    </Typography>
                    <Typography variant="caption" color="warning.main">
                      Admin accounts
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#f59e0b', width: 64, height: 64 }}>
                    <SupervisorAccountIcon fontSize="large" />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Total Events
                    </Typography>
                    <Typography variant="h3" fontWeight={700}>
                      {stats?.events?.total_events || stats?.event_stats?.total_events || 0}
                    </Typography>
                    <Typography variant="caption" color="primary.main">
                      All events
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#8b5cf6', width: 64, height: 64 }}>
                    <EventIcon fontSize="large" />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Paper elevation={0} sx={{ borderRadius: 4, mb: 3, border: '1px solid', borderColor: 'divider' }}>
          <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)} sx={{ px: 2 }}>
            <Tab label="User Management" icon={<PersonIcon />} iconPosition="start" />
            <Tab label="Analytics" icon={<TimelineIcon />} iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Tab 0: User Management */}
        {selectedTab === 0 && (
          <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight={700}>
                User Management
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>College</TableCell>
                    <TableCell>Current Role</TableCell>
                    <TableCell>Change Role</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(users) && users.length > 0 ? (
                    users.map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {user.name?.charAt(0) || 'U'}
                            </Avatar>
                            <Typography fontWeight={600}>{user.name || 'Unknown'}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{user.email || 'N/A'}</TableCell>
                        <TableCell>{user.college || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip
                            label={user.role?.replace('_', ' ').toUpperCase() || 'N/A'}
                            color={getRoleColor(user.role)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 150 }}>
                            <Select
                              value={user.role || 'student'}
                              onChange={(e) => updateUserRole(user.id, e.target.value)}
                              disabled={processingUser === user.id}
                            >
                              <MenuItem value="student">Student</MenuItem>
                              <MenuItem value="college_admin">College Admin</MenuItem>
                              <MenuItem value="super_admin">Super Admin</MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary" sx={{ py: 4 }}>
                          No users found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* ✅ FIX: Better Analytics Layout - Replace the Analytics Tab rendering section */}

        {/* Tab 1: Analytics */}
        {selectedTab === 1 && (
          <Grid container spacing={3}>
            {/* Row 1: Charts */}
            {analytics?.roleDistribution && analytics.roleDistribution.length > 0 && (
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    User Distribution
                  </Typography>
                  <ResponsiveContainer width="100%" height={300} minWidth={550}>
                    <PieChart>
                      <Pie
                        data={analytics.roleDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            )}

            {/* Events by College */}
            {analytics?.eventsByCollege && analytics.eventsByCollege.length > 0 && (
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Events by College
                  </Typography>
                  <ResponsiveContainer width="100%" height={300} minWidth={550}>
                    <BarChart data={analytics.eventsByCollege}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="events" fill="#667eea" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            )}

            {/* Row 2: Activity Summary - FULL WIDTH for better spacing */}
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
                  System Activity Summary
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" fontWeight={700} color="primary">
                        {stats?.events?.total_events || stats?.event_stats?.total_events || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Events Created
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" fontWeight={700} color="success.main">
                        {stats?.events?.total_registrations || stats?.registration_stats?.total_registrations || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Registrations
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" fontWeight={700} color="warning.main">
                        {stats?.registration_stats?.pending || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending Approvals
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" fontWeight={700} color="error.main">
                        {stats?.events?.approved_registrations || stats?.registration_stats?.approved || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Approved Registrations
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Row 3: Colleges List - FULL WIDTH for better visibility */}
            {stats?.colleges && stats.colleges.length > 0 && (
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
                    Active Colleges
                  </Typography>
                  <Grid container spacing={2}>
                    {stats.colleges.map((college, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Card
                          elevation={0}
                          sx={{
                            p: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            transition: 'all 0.3s',
                            '&:hover': {
                              borderColor: 'primary.main',
                              transform: 'translateY(-2px)',
                              boxShadow: 2,
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              <SchoolIcon />
                            </Avatar>
                            <Box>
                              <Typography fontWeight={600}>{college.college || 'Unknown'}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {college.user_count || 2} users
                              </Typography>
                            </Box>
                          </Box>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
            )}
          </Grid>
        )}

      </Container>
    </Box>
  );
};

export default DashboardSuperAdmin;