import React, { useEffect, useState } from 'react';
import api from '../api';
import {
  Box, Typography, Card, CardContent, Grid, Button, CircularProgress, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Tab,
  Tabs, Avatar, Tooltip, TextField, FormControl, InputLabel, Select, MenuItem,
  Stack, Rating, Snackbar, Container, Skeleton, Fade
} from '@mui/material';
import {
  Event as EventIcon, CheckCircle as ApproveIcon,
  Cancel as RejectIcon, Category as CategoryIcon, Room as LocationIcon,
  Schedule as ScheduleIcon, ViewList as ViewListIcon, Add as AddIcon,
  Feedback as FeedbackIcon, TrendingUp as TrendingUpIcon,
  People as PeopleIcon, CloudUpload as CloudUploadIcon, Notifications as NotificationsIcon
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import NotificationDialog from './NotificationDialog';

const DashboardAdmin = () => {
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [processingStatus, setProcessingStatus] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [eventFormData, setEventFormData] = useState({
    title: '', description: '', category: '', location: '', start_date: '', end_date: '', image: null
  });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [openFeedback, setOpenFeedback] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedback, setFeedback] = useState({ rating: 3, comments: '', event_id: null });
  const [feedbackStats, setFeedbackStats] = useState({
    overall: { events_with_feedback: 0, average_rating: 0, total_feedback: 0 },
    rating_distribution: [],
    top_events: [],
    recent_feedback: []
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [csvFile, setCSVFile] = useState(null);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);

  const userName = localStorage.getItem('userName') || 'Admin';

  const fetchFeedbackAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await api.get('/feedback/analytics');
      setFeedbackStats(response.data);
    } catch (error) {
      console.error('Error fetching feedback analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbackAnalytics();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.data);
    } catch (err) {
      setError('Failed to fetch events.');
    }
  };

  const handleCreateEvent = async () => {
    try {
      setCreating(true);
      setError('');
      const userId = localStorage.getItem('userId');

      const formData = new FormData();
      formData.append('title', eventFormData.title);
      formData.append('description', eventFormData.description);
      formData.append('category', eventFormData.category);
      formData.append('location', eventFormData.location);
      formData.append('college_id', parseInt(userId));
      formData.append('start_date', new Date(eventFormData.start_date).toISOString());
      formData.append('end_date', new Date(eventFormData.end_date).toISOString());

      if (eventFormData.image) {
        formData.append('image', eventFormData.image);
      }

      await api.post('/events', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await fetchEvents();
      setOpenCreateDialog(false);
      setEventFormData({
        title: '', description: '', category: '',
        location: '', start_date: '', end_date: '', image: null
      });
      setImagePreview(null);
      setSuccessMessage('Event created successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create event.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event? This cannot be undone.')) {
      try {
        setError('');
        await api.delete(`/events/${eventId}`);
        await fetchEvents();
        setSuccessMessage('Event deleted successfully!');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete event.');
      }
    }
  };

  const handleImageChange = (event) => {
    const files = event.target.files;
    if (files && files[0]) {
      const file = files[0];

      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should not exceed 5MB');
        return;
      }

      setError('');
      setEventFormData({ ...eventFormData, image: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const fetchRegistrations = async (eventId) => {
    try {
      setSelectedEvent(eventId);
      const res = await api.get(`/registrations/event/${eventId}`);
      setRegistrations(res.data);
    } catch (err) {
      setError('Failed to fetch registrations.');
    }
  };

  const updateStatus = async (regId, status) => {
    try {
      setProcessingStatus(regId);
      await api.put(`/registrations/${regId}`, { status });
      await fetchRegistrations(selectedEvent);
      setSuccessMessage(`Registration ${status} successfully!`);
    } catch (err) {
      setError('Failed to update registration status.');
    } finally {
      setProcessingStatus(null);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchEvents();
      setLoading(false);
    };
    loadData();
  }, []);

  const handleSubmitFeedback = async () => {
    try {
      setSubmittingFeedback(true);
      setError('');
      if (!feedback.event_id || !feedback.rating) {
        setError('Please provide valid feedback.');
        return;
      }
      await api.post('/feedback', {
        event_id: feedback.event_id,
        rating: feedback.rating,
        comments: feedback.comments
      });
      setOpenFeedback(false);
      setFeedback({ rating: 3, comments: '', event_id: null });
      setSuccessMessage('Feedback submitted successfully!');
      await fetchFeedbackAnalytics();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleCSVImport = async () => {
    if (!csvFile) {
      setError('Please select a CSV file');
      return;
    }

    try {
      setUploadingCSV(true);
      const formData = new FormData();
      formData.append('csv', csvFile);

      const response = await api.post('/events/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccessMessage(response.data.message);
      setCSVFile(null);
      await fetchEvents();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to import events');
    } finally {
      setUploadingCSV(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Sports': '#ff6b6b',
      'Hackathon': '#4ecdc4',
      'Cultural': '#f59e0b',
      'Workshop': '#8b5cf6'
    };
    return colors[category] || '#6366f1';
  };

  const filteredEvents = selectedCategory === 'All'
    ? events
    : events.filter(ev => (ev.category || '').trim().toLowerCase() === selectedCategory.toLowerCase());

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 4, mb: 3 }} />
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} md={6} key={i}>
              <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 4 }} />
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
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography variant="h3" fontWeight={700} gutterBottom>
                Welcome, {userName}! 🛠️
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Manage events, registrations, and feedback
              </Typography>
            </Box>
          </Paper>
        </Fade>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total Events
                    </Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {events.length}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#667eea', width: 56, height: 56 }}>
                    <EventIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total Registrations
                    </Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {registrations.length}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#4ecdc4', width: 56, height: 56 }}>
                    <PeopleIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Avg Rating
                    </Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {feedbackStats.overall.average_rating.toFixed(1)} ⭐
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#f59e0b', width: 56, height: 56 }}>
                    <TrendingUpIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total Feedback
                    </Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {feedbackStats.overall.total_feedback}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#8b5cf6', width: 56, height: 56 }}>
                    <FeedbackIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* CSV Import Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Bulk Import Events</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button variant="outlined" component="label">
              Select CSV File
              <input
                type="file"
                hidden
                accept=".csv"
                onChange={(e) => setCSVFile(e.target.files[0])}
              />
            </Button>

            {csvFile && <Typography variant="body2">{csvFile.name}</Typography>}

            <Button
              variant="contained"
              onClick={handleCSVImport}
              disabled={!csvFile || uploadingCSV}
            >
              {uploadingCSV ? 'Importing...' : 'Import Events'}
            </Button>

            <Button
              variant="text"
              onClick={() => window.open('http://localhost:3000/events/csv-template', '_blank')}
            >
              Download Template
            </Button>
          </Box>
        </Box>

        {/* Send Notification Button */}
        <Button
          variant="contained"
          startIcon={<NotificationsIcon />}
          onClick={() => setNotificationDialogOpen(true)}
          sx={{ 
            mb: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #6b3f8e 100%)',
            },
          }}
        >
          Send Notification
        </Button>

        {/* Enhanced Notification Dialog */}
        <NotificationDialog
          open={notificationDialogOpen}
          onClose={() => setNotificationDialogOpen(false)}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setNotificationDialogOpen(false);
          }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Snackbar
          open={!!successMessage}
          autoHideDuration={4000}
          onClose={() => setSuccessMessage('')}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity="success" onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        </Snackbar>

        {/* Tabs */}
        <Paper elevation={0} sx={{ borderRadius: 4, mb: 3, border: '1px solid', borderColor: 'divider' }}>
          <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)} sx={{ px: 2 }}>
            <Tab label="Events" icon={<EventIcon />} iconPosition="start" />
            <Tab label="Registrations" icon={<ViewListIcon />} iconPosition="start" disabled={!selectedEvent} />
            <Tab label="Feedback Analytics" icon={<FeedbackIcon />} iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Tab 0: Events */}
        {selectedTab === 0 && (
          <>
            {/* Header with Create Button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>My Events</Typography>
                <Typography variant="body2" color="textSecondary">
                  Total: {events.length} events
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenCreateDialog(true)}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #5568d3 0%, #6b3f8e 100%)' },
                }}
              >
                Create Event
              </Button>
            </Box>

            {/* Category Filter */}
            <FormControl sx={{ mb: 3, minWidth: 200 }}>
              <InputLabel>Filter by Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Filter by Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="All">All Categories</MenuItem>
                <MenuItem value="Sports">Sports</MenuItem>
                <MenuItem value="Hackathon">Hackathon</MenuItem>
                <MenuItem value="Cultural">Cultural</MenuItem>
                <MenuItem value="Workshop">Workshop</MenuItem>
              </Select>
            </FormControl>

            {/* Events Grid */}
            {filteredEvents.length === 0 ? (
              <Alert severity="info">
                {selectedCategory === 'All'
                  ? 'No events created yet. Create your first event!'
                  : `No ${selectedCategory} events found.`}
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {filteredEvents.map((ev) => (
                  <Grid item xs={12} sm={6} md={4} key={ev.id}>
                    <Card
                      sx={{
                        height: '100%',
                        width: '100%',
                        maxWidth: 350,
                        display: 'flex',
                        flexDirection: 'column',
                        '&:hover': { boxShadow: 6 },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {ev.image_url ? (
                        <Box
                          component="img"
                          src={`http://localhost:3000${ev.image_url}`}
                          alt={ev.title}
                          sx={{
                            width: '100%',
                            height: 200,
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: '100%',
                            height: 200,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'action.hover',
                            color: 'text.disabled',
                          }}
                        >
                          <EventIcon sx={{ fontSize: 70 }} />
                        </Box>
                      )}
                      <CardContent sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>
                          {ev.title}
                        </Typography>

                        <Chip
                          icon={<CategoryIcon />}
                          label={ev.category}
                          size="small"
                          sx={{
                            mb: 1,
                            backgroundColor: getCategoryColor(ev.category),
                            color: 'white',
                          }}
                        />

                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <LocationIcon sx={{ fontSize: 18, mr: 1, color: '#667eea' }} />
                          <Typography variant="body2" color="textSecondary">
                            {ev.location}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <ScheduleIcon sx={{ fontSize: 18, mr: 1, color: '#667eea' }} />
                          <Typography variant="body2" color="textSecondary">
                            {new Date(ev.start_date).toLocaleDateString()} - {new Date(ev.end_date).toLocaleDateString()}
                          </Typography>
                        </Box>

                        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                          {ev.description.substring(0, 100)}...
                        </Typography>
                      </CardContent>

                      <Box sx={{ display: 'flex', gap: 1, p: 2, borderTop: '1px solid #eee' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          fullWidth
                          onClick={() => {
                            fetchRegistrations(ev.id);
                            setSelectedTab(1);
                          }}
                          startIcon={<PeopleIcon sx={{ fontSize: 18 }} />}
                        >
                          Registrations
                        </Button>
                        <Tooltip title="Delete Event">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleDeleteEvent(ev.id)}
                          >
                            <RejectIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}

        {/* Tab 1: Registrations */}
        {selectedTab === 1 && selectedEvent && (
          <>
            <Box>
              <Button sx={{ justifyContent: "flex-start" }}
                variant="outlined"
                onClick={() => setSelectedTab(0)}
              >
                ← Back to Events
              </Button>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>
                  Registration Management
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<FeedbackIcon />}
                  onClick={() => {
                    setFeedback({ ...feedback, event_id: selectedEvent });
                    setOpenFeedback(true);
                  }}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }}
                >
                  Give Feedback
                </Button>
              </Box>

              <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Student</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {registrations.map((reg) => (
                        <TableRow key={reg.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar>{reg.student_name.charAt(0)}</Avatar>
                              <Typography fontWeight={600}>{reg.student_name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{reg.email}</TableCell>
                          <TableCell>
                            <Chip label={reg.status.toUpperCase()} color={getStatusColor(reg.status)} size="small" />
                          </TableCell>
                          <TableCell>{new Date(reg.timestamp).toLocaleDateString()}</TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={1} justifyContent="center">
                              <Tooltip title="Approve">
                                <IconButton
                                  color="success"
                                  onClick={() => updateStatus(reg.id, 'approved')}
                                  disabled={processingStatus === reg.id || reg.status === 'approved'}
                                >
                                  {processingStatus === reg.id ? <CircularProgress size={20} /> : <ApproveIcon />}
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton
                                  color="error"
                                  onClick={() => updateStatus(reg.id, 'rejected')}
                                  disabled={processingStatus === reg.id || reg.status === 'rejected'}
                                >
                                  <RejectIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          </>
        )}

        {/* Tab 2: Feedback Analytics */}
        {selectedTab === 2 && (
          <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
              Feedback Analytics 📊
            </Typography>

            {analyticsLoading ? (
              <Box display="flex" justifyContent="center" p={5}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {feedbackStats.top_events.length > 0 && (
                  <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      Top Rated Events
                    </Typography>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Event</TableCell>
                            <TableCell>Category</TableCell>
                            <TableCell>Average Rating</TableCell>
                            <TableCell>Feedback Count</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {feedbackStats.top_events.map((event) => (
                            <TableRow key={event.title} hover>
                              <TableCell fontWeight={600}>{event.title}</TableCell>
                              <TableCell>{event.category}</TableCell>
                              <TableCell>
                                <Rating value={parseFloat(event.averagerating)} readOnly precision={0.1} size="small" />
                                <Typography variant="body2" component="span" sx={{ ml: 1 }}>
                                  {event.averagerating}
                                </Typography>
                              </TableCell>
                              <TableCell>{event.feedbackcount}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                )}

                {feedbackStats.rating_distribution.length > 0 && (
                  <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      Rating Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={feedbackStats.rating_distribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="rating" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="count" fill="#667eea" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Paper>
                )}

                {feedbackStats.recent_feedback.length > 0 && (
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      Recent Feedback
                    </Typography>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Event</TableCell>
                            <TableCell>Student</TableCell>
                            <TableCell>Rating</TableCell>
                            <TableCell>Comments</TableCell>
                            <TableCell>Date</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {feedbackStats.recent_feedback.map((fb, index) => (
                            <TableRow key={index} hover>
                              <TableCell fontWeight={600}>{fb.event_title}</TableCell>
                              <TableCell>{fb.student_name}</TableCell>
                              <TableCell>
                                <Rating value={fb.rating} readOnly size="small" />
                              </TableCell>
                              <TableCell>{fb.comments || 'N/A'}</TableCell>
                              <TableCell>{new Date(fb.timestamp).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                )}
              </>
            )}
          </Box>
        )}

        {/* Create Event Dialog */}
        <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Event Title"
                fullWidth
                value={eventFormData.title}
                onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
              />
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={4}
                value={eventFormData.description}
                onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
              />
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={eventFormData.category}
                  label="Category"
                  onChange={(e) => setEventFormData({ ...eventFormData, category: e.target.value })}
                >
                  <MenuItem value="Sports">Sports</MenuItem>
                  <MenuItem value="Hackathon">Hackathon</MenuItem>
                  <MenuItem value="Cultural">Cultural</MenuItem>
                  <MenuItem value="Workshop">Workshop</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Location"
                fullWidth
                value={eventFormData.location}
                onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
              />
              <TextField
                label="Start Date"
                type="datetime-local"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={eventFormData.start_date}
                onChange={(e) => setEventFormData({ ...eventFormData, start_date: e.target.value })}
              />
              <TextField
                label="End Date"
                type="datetime-local"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={eventFormData.end_date}
                onChange={(e) => setEventFormData({ ...eventFormData, end_date: e.target.value })}
              />
              <Box>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  fullWidth
                >
                  Upload Event Image
                  <input type="file" hidden accept="image/*" onChange={handleImageChange} />
                </Button>
                {imagePreview && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
                  </Box>
                )}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleCreateEvent}
              disabled={creating}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              {creating ? <CircularProgress size={20} /> : 'Create Event'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Feedback Dialog */}
        <Dialog open={openFeedback} onClose={() => setOpenFeedback(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Submit Feedback</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Your Rating
                </Typography>
                <Rating
                  value={feedback.rating}
                  onChange={(e, newValue) => setFeedback({ ...feedback, rating: newValue })}
                  size="large"
                />
              </Box>
              <TextField
                label="Comments (Optional)"
                multiline
                rows={4}
                fullWidth
                value={feedback.comments}
                onChange={(e) => setFeedback({ ...feedback, comments: e.target.value })}
                placeholder="Share your thoughts about the event..."
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenFeedback(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSubmitFeedback}
              disabled={submittingFeedback}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              {submittingFeedback ? <CircularProgress size={20} /> : 'Submit Feedback'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default DashboardAdmin;