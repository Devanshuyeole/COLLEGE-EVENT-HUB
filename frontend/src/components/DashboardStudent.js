import { useEffect, useState } from 'react';
import api from '../api';
import {
  Box, Typography, Grid, Card, CardContent, CardActions, Button, Chip,
  CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Alert, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Rating, Snackbar, Container,
  Skeleton, Fade, Zoom, Avatar
} from '@mui/material';
import {
  Event as EventIcon, CheckCircle as CheckCircleIcon,
  PendingActions as PendingIcon, Cancel as CancelIcon,
  ExpandLess as ExpandLessIcon, ExpandMore as ExpandMoreIcon,
  Send as SendIcon, Feedback as FeedbackIcon, LocationOn as LocationIcon, Schedule as ScheduleIcon, People as PeopleIcon,
  TrendingUp as TrendingUp,
} from '@mui/icons-material';
import { Favorite, FavoriteBorder } from '@mui/icons-material';

const DashboardStudent = () => {
  const [events, setEvents] = useState([]);
  const [myRegs, setMyRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState(null);
  const [activeCommentsEvent, setActiveCommentsEvent] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [openFeedback, setOpenFeedback] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [feedback, setFeedback] = useState({ rating: 3, comments: '', event_id: null });
  const [selectedEventDetail, setSelectedEventDetail] = useState(null);
  const [openEventDetail, setOpenEventDetail] = useState(false);
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName') || 'Student';
  const [bookmarkedEvents, setBookmarkedEvents] = useState(new Set());
  const [showBookmarked, setShowBookmarked] = useState(false);
  const [profile, setProfile] = useState(null);
const [editingProfile, setEditingProfile] = useState(false);
const [profileData, setProfileData] = useState({ bio: '', profilePhoto: null });
const [leaderboard, setLeaderboard] = useState([]);
const [showLeaderboard, setShowLeaderboard] = useState(false);


  const fetchEvents = async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.data);
    } catch (err) {
      setError('Failed to fetch events. Please try again later.');
    }
  };

  const fetchMyRegs = async () => {
    try {
      const res = await api.get(`/registrations/user/${userId}`);
      setMyRegs(res.data);
    } catch (err) {
      setError('Failed to fetch your registrations.');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchEvents(), fetchMyRegs()]);
      setLoading(false);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegister = async (eventId) => {
    try {
      setRegistering(eventId);
      await api.post('/registrations', { event_id: eventId, user_id: userId });
      await fetchMyRegs();
      setSuccessMessage('Registration submitted successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register for the event.');
    } finally {
      setRegistering(null);
    }
  };

  const fetchComments = async (eventId) => {
    try {
      if (activeCommentsEvent === eventId) {
        setActiveCommentsEvent(null);
        return;
      }
      const response = await api.get(`/event-comments/${eventId}`);
      setComments(response.data);
      setActiveCommentsEvent(eventId);
    } catch (err) {
      setError('Failed to fetch comments.');
    }
  };

  const postComment = async (eventId) => {
    try {
      if (!newComment.trim()) return;
      await api.post('/event-comments', { event_id: eventId, comment: newComment });
      const response = await api.get(`/event-comments/${eventId}`);
      setComments(response.data);
      setNewComment('');
    } catch (err) {
      setError('Failed to post comment.');
    }
  };

  const submitFeedback = async () => {
    try {
      setSubmittingFeedback(true);
      setError('');
      if (!feedback.event_id || !feedback.rating) {
        setError('Please provide a valid rating.');
        return;
      }
      await api.post('/feedback', {
        event_id: feedback.event_id,
        rating: feedback.rating,
        comments: feedback.comments
      });
      setFeedback({ rating: 3, comments: '', event_id: null });
      setOpenFeedback(false);
      setSuccessMessage('Feedback submitted successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit feedback.');
    } finally {
      setSubmittingFeedback(false);
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircleIcon />;
      case 'pending': return <PendingIcon />;
      case 'rejected': return <CancelIcon />;
      default: return null;
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
  const fetchBookmarks = async () => {
    try {
      const response = await api.get('/bookmarks/my');
      const bookmarkedIds = new Set(response.data.map(e => e.id));
      setBookmarkedEvents(bookmarkedIds);
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err);
    }
  };

  const toggleBookmark = async (eventId) => {
    try {
      const response = await api.post('/bookmarks/toggle', { event_id: eventId });

      if (response.data.bookmarked) {
        setBookmarkedEvents(prev => new Set([...prev, eventId]));
        setSuccessMessage('Event bookmarked!');
      } else {
        setBookmarkedEvents(prev => {
          const newSet = new Set(prev);
          newSet.delete(eventId);
          return newSet;
        });
        setSuccessMessage('Bookmark removed!');
      }
    } catch (err) {
      setError('Failed to toggle bookmark');
    }
  }

  // Update useEffect to fetch bookmarks
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchEvents(), fetchMyRegs(), fetchBookmarks()]);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Add function to fetch profile
const fetchProfile = async () => {
  try {
    const userId = localStorage.getItem('userId');
    const response = await api.get(`/profile/${userId}`);
    setProfile(response.data);
    setProfileData({ bio: response.data.bio || '', profilePhoto: null });
  } catch (err) {
    console.error('Failed to fetch profile:', err);
  }
};
const fetchLeaderboard = async () => {
  try {
    const response = await api.get('/leaderboard');
    setLeaderboard(response.data);
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err);
  }
};


// Add function to update profile
const handleProfileUpdate = async () => {
  try {
    const formData = new FormData();
    formData.append('bio', profileData.bio);
    if (profileData.profilePhoto) {
      formData.append('profilePhoto', profileData.profilePhoto);
    }
    
    await api.put('/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    await fetchProfile();
    setEditingProfile(false);
    setSuccessMessage('Profile updated successfully!');
  } catch (err) {
    setError('Failed to update profile');
  }
};

// Add to useEffect
useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchEvents(), fetchMyRegs(), fetchBookmarks(), fetchProfile()]);
    setLoading(false);
  };
  fetchData();
}, []);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 4, mb: 3 }} />
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} md={6} lg={4} key={i}>
              <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 4 }} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  // {/* Event Detail Modal */}

  <Dialog
    open={openEventDetail}
    onClose={() => setOpenEventDetail(false)}
    maxWidth="md"
    fullWidth
  >
    {selectedEventDetail && (
      <>
        <DialogTitle>
          <Typography variant="h5">{selectedEventDetail.title}</Typography>
          <Chip
            label={selectedEventDetail.category}
            size="small"
            sx={{
              mt: 1,
              backgroundColor: getCategoryColor(selectedEventDetail.category),
              color: 'white',
            }}
          />
        </DialogTitle>

        <DialogContent>
          {/* Event Image */}
          {selectedEventDetail.image_url && (
            <Box
              component="img"
              src={`http://localhost:3000${selectedEventDetail.image_url}`}
              alt={selectedEventDetail.title}
              sx={{
                width: '100%',
                height: 300,
                objectFit: 'cover',
                borderRadius: 2,
                mb: 2,
              }}
            />
          )}

          {/* Location & Date */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <LocationIcon sx={{ mr: 1 }} /> {selectedEventDetail.location}
            </Typography>
            <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
              <ScheduleIcon sx={{ mr: 1 }} />
              {new Date(selectedEventDetail.start_date).toLocaleDateString()} -
              {new Date(selectedEventDetail.end_date).toLocaleDateString()}
            </Typography>
          </Box>

          {/* Description */}
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {selectedEventDetail.description}
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenEventDetail(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              handleRegister(selectedEventDetail.id);
              setOpenEventDetail(false);
            }}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            Register for Event
          </Button>
        </DialogActions>
      </>
    )}
  </Dialog>


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
              '&::before': {
                content: '""',
                position: 'absolute',
                width: '300px',
                height: '300px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                top: '-100px',
                right: '-100px',
              },
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography variant="h3" fontWeight={700} gutterBottom>
                Welcome back, {userName}! 👋
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Discover and register for exciting college events
              </Typography>
            </Box>
          </Paper>
        </Fade>

        {/* Error/Success Messages */}
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

        {/* Available Events */}
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
          Available Events 🎉
        </Typography>

        <Grid container spacing={3}>
          {events.map((ev, index) => (
            <Grid item xs={12} md={6} lg={4} key={ev.id}>
              <Zoom in timeout={300 + index * 100}>
                <Card
                  onClick={() => {
                    setSelectedEventDetail(ev);
                    setOpenEventDetail(true);
                  }}
                  elevation={0}
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    p: 0,
                    boxShadow: 3,
                    height: '100%',
                    // width: '100%',
                    maxWidth: 350,
                    display: 'flex',
                    flexWrap: 'wrap',
                    flexDirection: 'column',
                    position: 'relative',
                    transition: 'transform 0.25s cubic-bezier(.35,1.32,.55,1.1)',
                    '&:hover': { transform: 'scale(1.025)' },
                    backgroundColor: 'background.paper',
                  }}
                >
                  {/* Image Top Section */}
                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
                      height: 200,
                      // overflow: 'hidden',
                      backgroundColor: 'action.hover',
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
                    {/* Gradient Overlay */}
                    <Box sx={{
                      position: 'absolute',
                      left: 0, top: 0, width: '100%', height: '100%',
                      background: 'linear-gradient(180deg,rgba(0,0,0,.15) 50%,rgba(0,0,0,.52) 100%)'
                    }} />
                    {/* Category Badge (on top right) along with registration box */}
                    <Chip
                      icon={<PeopleIcon />} color="primary"
                      label={`${ev.registration_count || 0} Registered`}
                      size="small"
                      sx={{ 
                        position: 'absolute',
                        top: 12,
                        left: 15,
                        fontWeight: 700,
                        bgcolor: 'rgba(255,255,255,0.95)',
                        color: 'black',
                        letterSpacing: 0.5,
                        px: 1.2,
                        fontSize: 13,
                        }}
                    />
                    <Chip
                      label={ev.category}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 12,
                        right: 15,
                        fontWeight: 700,
                        bgcolor: 'rgba(255,255,255,0.95)',
                        color: 'black',
                        letterSpacing: 0.5,
                        px: 1.2,
                        fontSize: 13,
                      }}
                    />
                    
                  </Box>




                  {/* Event Details Section */}
                  <CardContent sx={{ flex: 1, pt: 2 }}>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(ev.id);
                      }}
                      sx={{ 
                        color: bookmarkedEvents.has(ev.id) ? '#e91e63' : '#ccc' ,
                        position: 'absolute',
                        right: 15,
                      }}
                    >
                      {bookmarkedEvents.has(ev.id) ? <Favorite /> : <FavoriteBorder />}
                    </IconButton>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 0.4, color: 'text.primary', minHeight: '2.8em', overflow: 'hidden' }}>
                      {ev.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom noWrap>
                      {ev.location || "Event Hall"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 1 }}>
                      <ScheduleIcon sx={{ fontSize: 16, color: '#764ba2' }} />
                      {new Date(ev.start_date).toLocaleDateString()} &ndash; {new Date(ev.end_date).toLocaleDateString()}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', minHeight: 45, overflow: 'hidden' }}>
                      {ev.description?.slice(0, 55) || ""}
                    </Typography>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0, flexDirection: 'column', gap: 1 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => handleRegister(ev.id)}
                      disabled={registering === ev.id}
                      sx={{
                        background: `linear-gradient(135deg, ${getCategoryColor(ev.category)} 0%, ${getCategoryColor(ev.category)}dd 100%)`,
                        '&:hover': {
                          background: `linear-gradient(135deg, ${getCategoryColor(ev.category)}dd 0%, ${getCategoryColor(ev.category)}bb 100%)`,
                        },
                      }}
                    >
                      {registering === ev.id ? <CircularProgress size={20} color="inherit" /> : 'Register Now'}
                    </Button>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Button
                          variant="outlined"
                          fullWidth
                          size="small"
                          startIcon={<FeedbackIcon />}
                          onClick={() => {
                            setOpenFeedback(true);
                            setFeedback({ ...feedback, event_id: ev.id });
                          }}
                        >
                          Feedback
                        </Button>
                      </Grid>
                      <Grid item xs={6}>
                        <Button
                          variant="outlined"
                          fullWidth
                          size="small"
                          startIcon={activeCommentsEvent === ev.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          onClick={() => fetchComments(ev.id)}
                        >
                          Discuss
                        </Button>
                      </Grid>
                    </Grid>
                  </CardActions>

                  {/* Comments Section */}
                  {activeCommentsEvent === ev.id && (
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderTop: '1px solid', borderColor: 'divider' }}>
                      {comments.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                          No comments yet. Start the conversation!
                        </Typography>
                      ) : (
                        <Box sx={{ maxHeight: 200, overflowY: 'auto', mb: 2 }}>
                          {comments.map((c) => (
                            <Box key={c.id} sx={{ mb: 1.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                                  {c.name.charAt(0)}
                                </Avatar>
                                <Typography variant="subtitle2" fontWeight={600}>
                                  {c.name}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ pl: 4 }}>
                                {c.comment}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && postComment(ev.id)}
                        InputProps={{
                          endAdornment: (
                            <IconButton onClick={() => postComment(ev.id)} disabled={!newComment.trim()}>
                              <SendIcon />
                            </IconButton>
                          ),
                        }}
                      />
                    </Box>
                  )}
                </Card>
              </Zoom>
            </Grid>
          ))}
        </Grid>

        {/* My Registrations */}
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ mt: 6, mb: 3 }}>
          My Registrations 📋
        </Typography>

        <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Event Title</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Registration Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {myRegs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                        No registrations yet. Register for an event to get started!
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  myRegs.map((reg) => (
                    <TableRow key={reg.id} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{reg.title}</Typography>
                      </TableCell>
                      <TableCell>{reg.location}</TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(reg.status)}
                          label={reg.status.toUpperCase()}
                          color={getStatusColor(reg.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(reg.timestamp).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        {/* Add this as a new section in your dashboard */}
<Box sx={{ mb: 4 }}>
  <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 ,mt: 3}}>
    My Profile
  </Typography>
  
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
        <Avatar
          src={profile?.profile_photo ? `http://localhost:3000${profile.profile_photo}` : undefined}
          sx={{ width: 100, height: 100 }}
        >
          {profile?.name?.charAt(0)}
        </Avatar>
        
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">{profile?.name}</Typography>
          <Typography variant="body2" color="text.secondary">{profile?.email}</Typography>
          <Typography variant="body2" color="text.secondary">{profile?.college}</Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <Chip label={`${profile?.points || 0} Points`} color="primary" size="small" />
            <Chip label={`${profile?.badges?.length || 0} Badges`} color="secondary" size="small" />
          </Box>
        </Box>
        
        <Button variant="outlined" onClick={() => setEditingProfile(!editingProfile)}>
          {editingProfile ? 'Cancel' : 'Edit Profile'}
        </Button>
      </Box>
      
      {editingProfile && (
        <Box sx={{ mt: 3 }}>
          <TextField
            label="Bio"
            multiline
            rows={4}
            fullWidth
            value={profileData.bio}
            onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
            sx={{ mb: 2 }}
          />
          
          <Button variant="outlined" component="label" sx={{ mb: 2 }}>
            Upload Profile Photo
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => setProfileData({ ...profileData, profilePhoto: e.target.files })}
            />
          </Button>
          
          {profileData.profilePhoto && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Selected: {profileData.profilePhoto.name}
            </Typography>
          )}
          
          <Button variant="contained" onClick={handleProfileUpdate} sx={{ mb: 2, ml: 2 }}>
            Save Changes
          </Button>
        </Box>
      )}
      
      {profile?.bio && !editingProfile && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {profile.bio}
          </Typography>
        </Box>
      )}
      
      {/* Badges Display */}
      {profile?.badges && profile.badges.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>My Badges</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {profile.badges.map((badge, idx) => (
              // <Tooltip key={idx} title={badge.description} arrow>
                <Chip
                  label={badge.name}
                  sx={{
                    bgcolor: '#ffd700',
                    color: '#000',
                    fontWeight: 600,
                    '&:hover': { bgcolor: '#ffed4e' }
                  }}
                />
              // </Tooltip>
            ))}
          </Box>
        </Box>
      )}
    </CardContent>
  </Card>
</Box>
<Dialog open={showLeaderboard} onClose={() => setShowLeaderboard(false)} maxWidth="md" fullWidth>
  <DialogTitle>🏆 Leaderboard - Top Students</DialogTitle>
  <DialogContent>
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Rank</TableCell>
            <TableCell>Student</TableCell>
            <TableCell align="center">Points</TableCell>
            <TableCell align="center">Events</TableCell>
            <TableCell align="center">Badges</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {leaderboard.map((leader, idx) => (
            <TableRow key={leader.id}>
              <TableCell>
                <Typography fontWeight={idx < 3 ? 700 : 400}>
                  #{idx + 1}
                </Typography>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar
                    src={leader.profile_photo ? `http://localhost:3000${leader.profile_photo}` : undefined}
                    sx={{ width: 32, height: 32 }}
                  >
                    {leader.name.charAt(0)}
                  </Avatar>
                  <Typography>{leader.name}</Typography>
                </Box>
              </TableCell>
              <TableCell align="center">
                <Chip label={leader.points} color="primary" size="small" />
              </TableCell>
              <TableCell align="center">{leader.events_attended}</TableCell>
              <TableCell align="center">{leader.badges?.length || 0}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setShowLeaderboard(false)}>Close</Button>
  </DialogActions>
</Dialog>

{/* Add button to open leaderboard */}
<Button
  variant="outlined"
  startIcon={<TrendingUp />}
  onClick={() => {
    fetchLeaderboard();
    setShowLeaderboard(true);
  }}
>
  View Leaderboard
</Button>


        {/* Feedback Dialog */}
        <Dialog open={openFeedback} onClose={() => setOpenFeedback(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FeedbackIcon color="primary" />
              Event Feedback
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
              How would you rate this event?
            </Typography>
            <Rating
              name="event-rating"
              value={feedback.rating}
              onChange={(event, newValue) => setFeedback({ ...feedback, rating: newValue })}
              precision={0.5}
              size="large"
              sx={{ mb: 3 }}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Comments (Optional)"
              placeholder="Share your experience about this event..."
              value={feedback.comments}
              onChange={(e) => setFeedback({ ...feedback, comments: e.target.value })}
            />
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setOpenFeedback(false)}>Cancel</Button>
            <Button
              onClick={submitFeedback}
              variant="contained"
              disabled={!feedback.rating || submittingFeedback}
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

export default DashboardStudent;