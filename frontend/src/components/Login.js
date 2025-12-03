import React, { useState } from 'react';
import api from '../api';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Paper,
  Avatar,
  CircularProgress,
  Link,
  InputAdornment,
  IconButton,
  Container,
  Fade,
  Slide,
} from '@mui/material';
import {
  LockOutlined as LockOutlinedIcon,
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  ArrowForward,
} from '@mui/icons-material';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      setSubmitError('');
      const res = await api.post('/login', formData);
      if (res.data.status === 'success' && res.data.data) {
        localStorage.setItem('token', res.data.data.token);
        localStorage.setItem('role', res.data.data.user.role);
        localStorage.setItem('userId', res.data.data.user.id.toString());
        localStorage.setItem('userName', res.data.data.user.name);

        // Navigate based on role
        const role = res.data.data.user.role;
        if (role === 'student') {
          navigate('/student');
        } else if (role === 'college_admin') {
          navigate('/admin');
        } else if (role === 'super_admin') {
          navigate('/super-admin');
        } else {
          throw new Error('Invalid role received');
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Login error:', err);
      setSubmitError(
        err.response?.data?.message || 
        err.message || 
        'Login failed. Please check your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) =>
          theme.palette.mode === 'light'
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: '500px',
          height: '500px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
          top: '-200px',
          right: '-200px',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          width: '400px',
          height: '400px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '50%',
          bottom: '-150px',
          left: '-150px',
        },
      }}
    >
      <Container maxWidth="sm">
        <Fade in timeout={800}>
          <Paper
            elevation={24}
            sx={{
              p: { xs: 3, sm: 5 },
              borderRadius: 4,
              background: (theme) =>
                theme.palette.mode === 'light'
                  ? 'rgba(255, 255, 255, 0.95)'
                  : 'rgba(26, 26, 46, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid',
              borderColor: (theme) =>
                theme.palette.mode === 'light' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Slide direction="down" in timeout={600}>
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    margin: '0 auto',
                    mb: 2,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                  }}
                >
                  <LockOutlinedIcon sx={{ fontSize: 32 }} />
                </Avatar>
              </Slide>

              <Typography
                variant="h4"
                fontWeight={700}
                gutterBottom
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Welcome Back
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in to continue to College EventHub
              </Typography>
            </Box>

            {/* Error Alert */}
            {submitError && (
              <Fade in>
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSubmitError('')}>
                  {submitError}
                </Alert>
              </Fade>
            )}

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                margin="normal"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: 'primary.main',
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                error={!!errors.password}
                helperText={errors.password}
                margin="normal"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon color="primary" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ textAlign: 'right', mt: 1, mb: 3 }}>
                <Link
                  component={RouterLink}
                  to="/forgot-password"
                  variant="body2"
                  sx={{
                    textDecoration: 'none',
                    fontWeight: 600,
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Forgot password?
                </Link>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                endIcon={isLoading ? null : <ArrowForward />}
                sx={{
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6b3f8e 100%)',
                    boxShadow: '0 6px 30px rgba(102, 126, 234, 0.5)',
                  },
                }}
              >
                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Don't have an account?{' '}
                  <Link
                    component={RouterLink}
                    to="/signup"
                    sx={{
                      fontWeight: 600,
                      textDecoration: 'none',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    Sign up here
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default Login;
