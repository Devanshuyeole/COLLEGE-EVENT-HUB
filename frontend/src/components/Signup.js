import { useState } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
  Container,
  Fade,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
} from '@mui/material';
import {
  PersonAddOutlined,
  Email as EmailIcon,
  LockOutlined,
  School as SchoolIcon,
  Visibility,
  VisibilityOff,
  ArrowForward,
  ArrowBack,
  CheckCircle,
} from '@mui/icons-material';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    college: '',
    role: 'student',
    authorizationCode: ''
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const navigate = useNavigate();

  const steps = ['Account Info', 'College Details', 'Verification'];

  const validateForm = () => {
    const newErrors = {};
    if (formData.name.length < 2) newErrors.name = 'Name must be at least 2 characters long';
    else if (!/^[a-zA-Z\s]+$/.test(formData.name)) newErrors.name = 'Name can only contain letters and spaces';
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, number, and special character';
    }
    
    if (!formData.college || formData.college.length < 3) {
      newErrors.college = 'Please enter a valid college name';
    }
    
    if (formData.role !== 'student' && !formData.authorizationCode) {
      newErrors.authorizationCode = 'Authorization code is required for this role';
    }

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

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      setSubmitError('');
      await api.post('/signup', formData);
      // Success - show success step
      setActiveStep(3);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setSubmitError(
        err.response?.data?.errors 
          ? err.response.data.errors.join(', ') 
          : err.response?.data?.message || 'Signup failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const password = formData.password;
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 25;
    if (/[!@#$%^&*]/.test(password)) strength += 25;
    return strength;
  };

  const getPasswordStrengthColor = () => {
    const strength = getPasswordStrength();
    if (strength < 50) return 'error';
    if (strength < 75) return 'warning';
    return 'success';
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <TextField
              fullWidth
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonAddOutlined color="primary" />
                  </InputAdornment>
                ),
              }}
            />
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
                    <LockOutlined color="primary" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {formData.password && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Password Strength
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={getPasswordStrength()}
                  color={getPasswordStrengthColor()}
                  sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                />
              </Box>
            )}
          </Box>
        );
      case 1:
        return (
          <Box>
            <TextField
              fullWidth
              label="College Name"
              name="college"
              value={formData.college}
              onChange={handleChange}
              error={!!errors.college}
              helperText={errors.college}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SchoolIcon color="primary" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={formData.role}
                label="Role"
                onChange={handleChange}
              >
                <MenuItem value="student">Student</MenuItem>
                <MenuItem value="college_admin">College Admin</MenuItem>
                <MenuItem value="super_admin">Super Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        );
      case 2:
        return (
          <Box>
            {formData.role !== 'student' && (
              <TextField
                fullWidth
                label="Authorization Code"
                name="authorizationCode"
                value={formData.authorizationCode}
                onChange={handleChange}
                error={!!errors.authorizationCode}
                helperText={errors.authorizationCode || 'Required for admin roles'}
                margin="normal"
                type="password"
              />
            )}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mt: 2,
                bgcolor: 'action.hover',
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                Review Your Information
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Name:</strong> {formData.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Email:</strong> {formData.email}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>College:</strong> {formData.college}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Role:</strong> {formData.role.replace('_', ' ').toUpperCase()}
              </Typography>
            </Paper>
          </Box>
        );
      case 3:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle color="success" sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Account Created Successfully!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Redirecting to login page...
            </Typography>
          </Box>
        );
      default:
        return null;
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
        py: 4,
      }}
    >
      <Container maxWidth="md">
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
            }}
          >
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
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
                <PersonAddOutlined sx={{ fontSize: 32 }} />
              </Avatar>
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
                Create Account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Join College EventHub today
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

            {/* Stepper */}
            {activeStep < 3 && (
              <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            )}

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit}>
              {renderStepContent(activeStep)}

              {/* Navigation Buttons */}
              {activeStep < 3 && (
                <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
                  {activeStep > 0 && (
                    <Button
                      onClick={handleBack}
                      startIcon={<ArrowBack />}
                      variant="outlined"
                      fullWidth
                    >
                      Back
                    </Button>
                  )}
                  {activeStep < 2 ? (
                    <Button
                      onClick={handleNext}
                      endIcon={<ArrowForward />}
                      variant="contained"
                      fullWidth
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5568d3 0%, #6b3f8e 100%)',
                        },
                      }}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={isLoading}
                      endIcon={isLoading ? null : <CheckCircle />}
                      variant="contained"
                      fullWidth
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5568d3 0%, #6b3f8e 100%)',
                        },
                      }}
                    >
                      {isLoading ? <CircularProgress size={24} /> : 'Create Account'}
                    </Button>
                  )}
                </Box>
              )}

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{' '}
                  <Link
                    component={RouterLink}
                    to="/login"
                    sx={{
                      fontWeight: 600,
                      textDecoration: 'none',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    Sign in here
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

export default Signup;
