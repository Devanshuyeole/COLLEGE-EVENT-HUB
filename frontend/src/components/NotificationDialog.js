// frontend/src/components/NotificationDialog.js - FIXED VERSION
import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  InputLabel,
  Chip,
  Box,
  Typography,
  Autocomplete,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Send as SendIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Event as EventIcon,
  Close as CloseIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

const NotificationDialog = ({ open, onClose, onSuccess }) => {
  const [notificationData, setNotificationData] = useState({
    title: '',
    message: '',
    targetType: 'all',
    targetIds: [],
    eventId: null
  });
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventStudents, setEventStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  // Fetch students and events on mount
  useEffect(() => {
    if (open) {
      fetchStudents();
      fetchEvents();
    }
  }, [open]);

  // Fetch event students when event is selected for 'event' target type
  useEffect(() => {
    if (notificationData.targetType === 'event' && notificationData.eventId) {
      fetchEventStudents(notificationData.eventId);
    }
  }, [notificationData.targetType, notificationData.eventId]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/students');
      setStudents(response.data);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await api.get('/admin/events-list');
      setEvents(response.data);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events');
    }
  };

  const fetchEventStudents = async (eventId) => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/event/${eventId}/students`);
      setEventStudents(response.data);
    } catch (err) {
      console.error('Error fetching event students:', err);
      setError('Failed to load event students');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async () => {
    try {
      setSending(true);
      setError('');

      // Validation
      if (!notificationData.title || !notificationData.message) {
        setError('Title and message are required');
        return;
      }

      if (notificationData.targetType === 'specific' && notificationData.targetIds.length === 0) {
        setError('Please select at least one student');
        return;
      }

      if (notificationData.targetType === 'event' && !notificationData.eventId) {
        setError('Please select an event for event-based targeting');
        return;
      }

      // Prepare payload based on target type
      const payload = {
        title: notificationData.title,
        message: notificationData.message,
        type: 'general',
        targetType: notificationData.targetType,
        eventId: notificationData.eventId || null
      };

      // Add specific fields based on target type
      if (notificationData.targetType === 'specific') {
        payload.targetIds = notificationData.targetIds;
      } 
      const response = await api.post('/notifications/broadcast', payload);
      
      onSuccess(response.data.message);
      handleClose();
    } catch (err) {
      console.error('Notification send error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setNotificationData({
      title: '',
      message: '',
      targetType: 'all',
      targetIds: [],
      eventId: null
    });
    setError('');
    setEventStudents([]);
    onClose();
  };

  const getTargetCount = () => {
    switch (notificationData.targetType) {
      case 'all':
        return students.length;
      case 'specific':
        return notificationData.targetIds.length;
      case 'event':
        return eventStudents.length;
      default:
        return 0;
    }
  };

  const getSelectedEvent = () => {
    if (!notificationData.eventId) return null;
    return events.find(e => e.id === notificationData.eventId);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={700}>
            Send Notification to Students
          </Typography>
          <Button onClick={handleClose} color="inherit" size="small">
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Title */}
        <TextField
          label="Notification Title"
          fullWidth
          value={notificationData.title}
          onChange={(e) => setNotificationData({ ...notificationData, title: e.target.value })}
          sx={{ mb: 2, mt: 1 }}
          placeholder="e.g., Important Update"
        />

        {/* Message */}
        <TextField
          label="Message"
          fullWidth
          multiline
          rows={4}
          value={notificationData.message}
          onChange={(e) => setNotificationData({ ...notificationData, message: e.target.value })}
          sx={{ mb: 3 }}
          placeholder="Enter your notification message..."
        />

        {/* Target Type Selection */}
        <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
          <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
            Send To
          </FormLabel>
          <RadioGroup
            value={notificationData.targetType}
            onChange={(e) => setNotificationData({ 
              ...notificationData, 
              targetType: e.target.value,
              targetIds: [],
              // Keep eventId when switching between types
            })}
          >
            <FormControlLabel
              value="all"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PeopleIcon color="primary" />
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      All Students
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Send to all {students.length} students
                    </Typography>
                  </Box>
                </Box>
              }
            />
            <FormControlLabel
              value="specific"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon color="primary" />
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      Specific Students
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Select individual students
                    </Typography>
                  </Box>
                </Box>
              }
            />
            <FormControlLabel
              value="event"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EventIcon color="primary" />
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      Event Registrants
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Send to students registered for an event
                    </Typography>
                  </Box>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>

        {/* Specific Students Selection */}
        {notificationData.targetType === 'specific' && (
          <Autocomplete
            multiple
            options={students}
            getOptionLabel={(option) => `${option.name} (${option.email})`}
            value={students.filter(s => notificationData.targetIds.includes(s.id))}
            onChange={(event, newValue) => {
              setNotificationData({
                ...notificationData,
                targetIds: newValue.map(v => v.id)
              });
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Students"
                placeholder="Search and select students..."
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return (
                  <Chip
                    key={option.id}
                    label={option.name}
                    {...tagProps}
                    size="small"
                  />
                );
              })
            }
            sx={{ mb: 2 }}
          />
        )}

        {/* Event Selection for event target type */}
        {notificationData.targetType === 'event' && (
          <>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Event</InputLabel>
              <Select
                value={notificationData.eventId || ''}
                label="Select Event"
                onChange={(e) => setNotificationData({
                  ...notificationData,
                  eventId: e.target.value
                })}
              >
                {events.map((event) => (
                  <MenuItem key={event.id} value={event.id}>
                    <Box>
                      <Typography variant="body1">{event.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {event.registration_count} registrations • {new Date(event.start_date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Show Event Students */}
            {loading && notificationData.eventId && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}

            {!loading && eventStudents.length > 0 && (
              <Box sx={{ 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 2, 
                p: 2, 
                maxHeight: 200, 
                overflow: 'auto',
                mb: 2
              }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  Will notify {eventStudents.length} students:
                </Typography>
                <List dense>
                  {eventStudents.slice(0, 10).map((student) => (
                    <ListItem key={student.id}>
                      <ListItemAvatar>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {student.name.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={student.name}
                        secondary={student.email}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      <Chip 
                        label={student.status} 
                        size="small" 
                        color={student.status === 'approved' ? 'success' : 'default'}
                      />
                    </ListItem>
                  ))}
                  {eventStudents.length > 10 && (
                    <Typography variant="caption" color="text.secondary" sx={{ pl: 2 }}>
                      ...and {eventStudents.length - 10} more
                    </Typography>
                  )}
                </List>
              </Box>
            )}
          </>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Optional Event Link for "All" and "Specific" target types */}
        {(notificationData.targetType === 'all' || notificationData.targetType === 'specific') && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <InfoIcon color="info" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={600}>
                Link to Event (Optional)
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Optionally link this notification to a specific event. The event will appear as a tag in the notification.
            </Typography>
            
            <FormControl fullWidth>
              <InputLabel>Select Event (Optional)</InputLabel>
              <Select
                value={notificationData.eventId || ''}
                label="Select Event (Optional)"
                onChange={(e) => setNotificationData({
                  ...notificationData,
                  eventId: e.target.value || null
                })}
              >
                <MenuItem value="">
                  <em>No Event</em>
                </MenuItem>
                {events.map((event) => (
                  <MenuItem key={event.id} value={event.id}>
                    <Box>
                      <Typography variant="body1">{event.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(event.start_date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {notificationData.eventId && (
              <Alert severity="info" sx={{ mt: 2 }}>
                This notification will be linked to event: <strong>{getSelectedEvent()?.title}</strong>
              </Alert>
            )}
          </Box>
        )}

        {/* Summary */}
        <Box sx={{ 
          mt: 3, 
          p: 2, 
          bgcolor: 'primary.main', 
          color: 'primary.contrastText',
          borderRadius: 2 
        }}>
          <Typography variant="body2" fontWeight={600}>
            📢 This notification will be sent to {getTargetCount()} student{getTargetCount() !== 1 ? 's' : ''}
          </Typography>
          {notificationData.eventId && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.9 }}>
              📎 Linked to: {getSelectedEvent()?.title}
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={sending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={sending ? <CircularProgress size={20} /> : <SendIcon />}
          onClick={handleSendNotification}
          disabled={sending || getTargetCount() === 0}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          {sending ? 'Sending...' : 'Send Notification'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationDialog;